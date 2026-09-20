from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_predict_missing_features():
    res = client.post("/predict", json={"features": {"bmi": 22}})
    assert res.status_code == 200
    assert res.json()["available"] is False
