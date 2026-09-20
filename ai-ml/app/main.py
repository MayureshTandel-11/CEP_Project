from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.config import ML_ENABLED, ML_PORT
from app.features.engineering import FEATURE_DESCRIPTIONS, FEATURE_NAMES, build_feature_row
from app.prediction.predictor import get_metadata, predict_category
from app.preprocessing.pipeline import build_dataframe, impute_raw
from app.training.retrain import retrain
from app.training.train import save, train

app = FastAPI(title="Wellness ML Service", version="1.0.0")


class PredictRequest(BaseModel):
    features: dict = Field(default_factory=dict)
    raw: dict | None = None


class TrainRequest(BaseModel):
    samples: int = 3000


class RetrainRequest(BaseModel):
    extra_rows: list[dict] = Field(default_factory=list)
    extra_labels: list[str] = Field(default_factory=list)
    samples: int = 3000
    force: bool = False


@app.get("/health")
def health():
    return {"success": True, "ml_enabled": ML_ENABLED, "port": ML_PORT}


@app.post("/predict")
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


@app.get("/model/explanation")
@app.get("/model/metadata")
def metadata():
    data = get_metadata() or {}
    if not data:
        return {"available": False, "reason": "Model metadata is not loaded."}
    return {**data, "available": True, "feature_descriptions": FEATURE_DESCRIPTIONS}


@app.post("/train")
def train_endpoint(body: TrainRequest):
    model, meta, _ = train(body.samples)
    save(model, meta)
    return {"available": True, "metrics": meta["metrics"], "n_samples": meta["n_samples"], "model_type": meta["model_type"]}


@app.post("/retrain")
def retrain_endpoint(body: RetrainRequest):
    return retrain(body.extra_rows, body.extra_labels, samples=body.samples, force=body.force)


@app.post("/evaluate")
def evaluate_endpoint(body: TrainRequest):
    model, meta, metrics = train(body.samples)
    return {"available": True, "metrics": metrics, "model_type": meta["model_type"], "n_samples": meta["n_samples"]}
