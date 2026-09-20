from app.config import MIN_ACCURACY_TO_PROMOTE
from app.prediction.predictor import get_metadata, reset_cache
from app.training.train import save, train


def retrain(extra_rows=None, extra_labels=None, samples: int = 3000, force: bool = False) -> dict:
    model, metadata, _ = train(samples, extra_rows=extra_rows or [], extra_labels=extra_labels or [])
    current = get_metadata() or {}
    current_acc = (current.get("metrics") or {}).get("accuracy", 0.0) or 0.0
    new_acc = metadata["metrics"]["accuracy"]
    promote = force or (new_acc >= MIN_ACCURACY_TO_PROMOTE and new_acc >= current_acc)
    if promote:
        save(model, metadata)
        reset_cache()
    return {
        "available": True,
        "promoted": promote,
        "metrics": metadata["metrics"],
        "n_samples": metadata["n_samples"],
        "nSamples": metadata["n_samples"],
        "model_type": metadata["model_type"],
        "modelType": metadata["model_type"],
        "feedback_rows": len(extra_rows or []),
        "current_accuracy": current_acc,
        "notes": f"{len(extra_rows or [])} feedback-derived rows included",
    }
