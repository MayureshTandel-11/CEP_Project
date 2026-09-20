import json
import logging
from datetime import datetime
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.config import METADATA_PATH, MODEL_PATH
from app.evaluation.metrics import evaluate_model
from app.features.engineering import FEATURE_DESCRIPTIONS, FEATURE_NAMES
from app.preprocessing.pipeline import build_dataframe
from app.training.dataset import generate_dataset

logger = logging.getLogger("train_model")

MODEL_PARAMS = {
    "n_estimators": 200,
    "max_depth": 12,
    "min_samples_leaf": 3,
    "class_weight": "balanced",
    "random_state": 42,
}


def train(n_samples: int = 3000, test_size: float = 0.2, extra_rows=None, extra_labels=None):
    rows, labels = generate_dataset(n_samples)
    if extra_rows:
        rows = rows + extra_rows
        labels = labels + list(extra_labels or [])
        logger.info("Added %d feedback-derived rows to the training set", len(extra_rows))

    X = build_dataframe(rows)
    y = labels
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    model = RandomForestClassifier(**MODEL_PARAMS)
    model.fit(X_train, y_train)
    metrics = evaluate_model(model, X_test, y_test)
    importances = dict(zip(
        FEATURE_NAMES,
        [round(float(v), 4) for v in model.feature_importances_],
    ))
    metadata = {
        "model_type": "RandomForestClassifier",
        "model_params": MODEL_PARAMS,
        "trained_at": datetime.utcnow().isoformat(),
        "n_samples": len(X),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "data_source": "synthetic demo dataset (ai-ml/app/training/dataset.py) - not real medical data",
        "features": FEATURE_NAMES,
        "feature_descriptions": FEATURE_DESCRIPTIONS,
        "feature_importances": importances,
        "classes": list(model.classes_),
        "metrics": {k: metrics[k] for k in ("accuracy", "precision", "recall", "f1")},
        "confusion_matrix": metrics["confusion_matrix"],
        "confusion_labels": metrics["labels"],
    }
    return model, metadata, metrics


def save(model, metadata, model_path=None, metadata_path=None):
    model_path = Path(model_path or MODEL_PATH)
    metadata_path = Path(metadata_path or METADATA_PATH)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    metadata_path.write_text(json.dumps(metadata, indent=2))
    logger.info("Saved model -> %s", model_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model, metadata, _ = train()
    save(model, metadata)
    print(json.dumps(metadata["metrics"], indent=2))
