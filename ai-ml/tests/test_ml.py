from app.features.engineering import FEATURE_NAMES, build_feature_row
from app.prediction.predictor import predict_category
from app.preprocessing.pipeline import impute_raw
from app.training.dataset import generate_dataset, label_row
from app.training.train import train


def test_impute_fills_sleep_and_water():
    filled = impute_raw({"bmi": 22, "age": 24, "water_target_ml": 2500, "calorie_target": 2000})
    assert filled["sleep_hours"] == 7.0
    assert filled["water_ml"] == 2500
    assert filled["calories"] == 2000


def test_feature_row_has_expected_keys():
    raw = impute_raw({
        "bmi": 22.8, "age": 24, "activity_level": "light", "goal": "weight_loss",
        "gender": "male", "sleep_hours": 6.5, "water_ml": 1800, "water_target_ml": 2500,
        "exercise_minutes": 20, "steps": 5000, "calories": 2000, "calorie_target": 2100,
        "stress_level": 3,
    })
    features = build_feature_row(raw)
    assert list(features.keys()) == FEATURE_NAMES
    assert features["sleep_adequacy"] in (0, 1)


def test_label_heuristic_sleep():
    assert label_row({
        "sleep_hours": 5, "water_ml": 2000, "water_target_ml": 2000,
        "exercise_minutes": 40, "steps": 9000, "bmi": 22, "goal": "general_wellness",
    }) == "sleep_focus"


def test_generate_dataset_sizes():
    rows, labels = generate_dataset(40, seed=1)
    assert len(rows) == 40
    assert len(labels) == 40


def test_train_and_predict_small():
    model, metadata, metrics = train(n_samples=400, test_size=0.25)
    assert metadata["model_type"] == "RandomForestClassifier"
    assert "accuracy" in metrics
    assert metadata["feature_importances"]
    # Use the in-memory model via predict after save is optional; just check predict envelope
    sample = build_feature_row(impute_raw(generate_dataset(1, seed=2)[0][0]))
    result = predict_category(sample, enabled=True)
    assert "available" in result


def test_predict_disabled():
    sample = {name: 1 for name in FEATURE_NAMES}
    result = predict_category(sample, enabled=False)
    assert result["available"] is False


def test_predict_invalid_features():
    result = predict_category({"bmi": 1}, enabled=True)
    assert result["available"] is False
