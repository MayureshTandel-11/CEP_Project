import hmac
import threading

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app import config
from app.config import ML_ENABLED, ML_PORT
from app.features.engineering import FEATURE_DESCRIPTIONS, FEATURE_NAMES, build_feature_row
from app.prediction.predictor import get_metadata, predict_category
from app.preprocessing.pipeline import build_dataframe, impute_raw
from app.training.retrain import retrain
from app.training.train import save, train

app = FastAPI(title="Wellness ML Service", version="1.0.0")

# Only one training job at a time: training is CPU-heavy and replaces the model file.
_train_lock = threading.Lock()


def _token_matches(provided: str | None) -> bool:
    expected = config.ML_INTERNAL_TOKEN
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Training endpoints: always require the shared secret; disabled if none is set."""
    if not config.ML_INTERNAL_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Internal endpoints are disabled: ML_INTERNAL_TOKEN is not configured.",
        )
    if not x_internal_token:
        raise HTTPException(status_code=401, detail="Missing X-Internal-Token header.")
    if not _token_matches(x_internal_token):
        raise HTTPException(status_code=403, detail="Invalid internal token.")


def optional_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Prediction endpoints: require the secret whenever one is configured."""
    if not config.ML_INTERNAL_TOKEN:
        return
    if not x_internal_token:
        raise HTTPException(status_code=401, detail="Missing X-Internal-Token header.")
    if not _token_matches(x_internal_token):
        raise HTTPException(status_code=403, detail="Invalid internal token.")


def _exclusive_training():
    """Context for a training job; 409 if another one is already running."""
    if not _train_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A training job is already running.")
    return _train_lock


class PredictRequest(BaseModel):
    features: dict = Field(default_factory=dict)
    raw: dict | None = None


class TrainRequest(BaseModel):
    samples: int = Field(default=3000, ge=200, le=20000)


class RetrainRequest(BaseModel):
    extra_rows: list[dict] = Field(default_factory=list, max_length=50000)
    extra_labels: list[str] = Field(default_factory=list, max_length=50000)
    samples: int = Field(default=3000, ge=200, le=20000)
    force: bool = False


@app.get("/health")
def health():
    return {"success": True, "ml_enabled": ML_ENABLED, "port": ML_PORT}


@app.post("/predict", dependencies=[Depends(optional_internal_token)])
def predict(body: PredictRequest):
    features = body.features
    if body.raw:
        features = build_feature_row(impute_raw(body.raw))
    if not features:
        return {"available": False, "reason": "No features provided."}
    missing = [name for name in FEATURE_NAMES if name not in features]
    if missing:
        return {"available": False, "reason": f"Invalid input: missing features {missing}"}
    return predict_category(features)


@app.get("/model/explanation", dependencies=[Depends(optional_internal_token)])
@app.get("/model/metadata", dependencies=[Depends(optional_internal_token)])
def metadata():
    data = get_metadata() or {}
    if not data:
        return {"available": False, "reason": "Model metadata is not loaded."}
    return {**data, "available": True, "feature_descriptions": FEATURE_DESCRIPTIONS}


@app.post("/train", dependencies=[Depends(require_internal_token)])
def train_endpoint(body: TrainRequest):
    lock = _exclusive_training()
    try:
        model, meta, _ = train(body.samples)
        save(model, meta)
    finally:
        lock.release()
    return {"available": True, "metrics": meta["metrics"], "n_samples": meta["n_samples"], "model_type": meta["model_type"]}


@app.post("/retrain", dependencies=[Depends(require_internal_token)])
def retrain_endpoint(body: RetrainRequest):
    lock = _exclusive_training()
    try:
        return retrain(body.extra_rows, body.extra_labels, samples=body.samples, force=body.force)
    finally:
        lock.release()


@app.post("/evaluate", dependencies=[Depends(require_internal_token)])
def evaluate_endpoint(body: TrainRequest):
    lock = _exclusive_training()
    try:
        model, meta, metrics = train(body.samples)
    finally:
        lock.release()
    return {"available": True, "metrics": metrics, "model_type": meta["model_type"], "n_samples": meta["n_samples"]}
