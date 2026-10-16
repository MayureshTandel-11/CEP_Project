"""Authorization tests for the internal ML endpoints."""
import pytest
from fastapi.testclient import TestClient

from app import config
from app import main as main_module
from app.features.engineering import FEATURE_NAMES

client = TestClient(main_module.app)
TOKEN = "unit-test-secret-token"
GUARDED = ["/train", "/retrain", "/evaluate"]


@pytest.fixture(autouse=True)
def stub_training(monkeypatch):
    """Replace the heavy training functions so tests never train a model or touch disk."""
    fake_meta = {"metrics": {"accuracy": 0.9}, "n_samples": 1, "model_type": "stub"}
    calls = {"train": 0, "save": 0, "retrain": 0}

    def fake_train(*_a, **_k):
        calls["train"] += 1
        return object(), fake_meta, {"accuracy": 0.9}

    def fake_save(*_a, **_k):
        calls["save"] += 1

    def fake_retrain(*_a, **_k):
        calls["retrain"] += 1
        return {"available": True, "promoted": False}

    monkeypatch.setattr(main_module, "train", fake_train)
    monkeypatch.setattr(main_module, "save", fake_save)
    monkeypatch.setattr(main_module, "retrain", fake_retrain)
    return calls


def set_token(monkeypatch, value):
    monkeypatch.setattr(config, "ML_INTERNAL_TOKEN", value)


def valid_features():
    return {name: 1 for name in FEATURE_NAMES}


class TestTrainingEndpointsWhenTokenUnset:
    @pytest.mark.parametrize("path", GUARDED)
    def test_disabled_with_503(self, monkeypatch, stub_training, path):
        set_token(monkeypatch, "")
        res = client.post(path, json={})
        assert res.status_code == 503
        assert stub_training == {"train": 0, "save": 0, "retrain": 0}

    @pytest.mark.parametrize("path", GUARDED)
    def test_a_header_does_not_bypass_an_unset_token(self, monkeypatch, path):
        set_token(monkeypatch, "")
        res = client.post(path, json={}, headers={"X-Internal-Token": ""})
        assert res.status_code == 503


class TestTrainingEndpointsWithToken:
    @pytest.mark.parametrize("path", GUARDED)
    def test_missing_header_is_401(self, monkeypatch, stub_training, path):
        set_token(monkeypatch, TOKEN)
        res = client.post(path, json={})
        assert res.status_code == 401
        assert stub_training == {"train": 0, "save": 0, "retrain": 0}

    @pytest.mark.parametrize("path", GUARDED)
    def test_wrong_token_is_403(self, monkeypatch, stub_training, path):
        set_token(monkeypatch, TOKEN)
        res = client.post(path, json={}, headers={"X-Internal-Token": "nope"})
        assert res.status_code == 403
        assert stub_training == {"train": 0, "save": 0, "retrain": 0}

    @pytest.mark.parametrize("path", GUARDED)
    def test_token_that_is_a_prefix_is_rejected(self, monkeypatch, path):
        set_token(monkeypatch, TOKEN)
        res = client.post(path, json={}, headers={"X-Internal-Token": TOKEN[:-1]})
        assert res.status_code == 403

    @pytest.mark.parametrize("path", GUARDED)
    def test_correct_token_is_accepted(self, monkeypatch, path):
        set_token(monkeypatch, TOKEN)
        res = client.post(path, json={}, headers={"X-Internal-Token": TOKEN})
        assert res.status_code == 200

    def test_train_actually_runs_only_when_authorized(self, monkeypatch, stub_training):
        set_token(monkeypatch, TOKEN)
        client.post("/train", json={})
        assert stub_training["train"] == 0 and stub_training["save"] == 0
        client.post("/train", json={}, headers={"X-Internal-Token": TOKEN})
        assert stub_training["train"] == 1 and stub_training["save"] == 1


class TestPredictionEndpoints:
    def test_open_when_no_token_is_configured(self, monkeypatch):
        set_token(monkeypatch, "")
        res = client.post("/predict", json={"features": {"bmi": 22}})
        assert res.status_code == 200
        assert res.json()["available"] is False  # missing features, but not blocked

    def test_require_token_when_configured(self, monkeypatch):
        set_token(monkeypatch, TOKEN)
        assert client.post("/predict", json={"features": valid_features()}).status_code == 401
        bad = client.post("/predict", json={"features": valid_features()}, headers={"X-Internal-Token": "x"})
        assert bad.status_code == 403
        ok = client.post("/predict", json={"features": valid_features()}, headers={"X-Internal-Token": TOKEN})
        assert ok.status_code == 200

    @pytest.mark.parametrize("path", ["/model/metadata", "/model/explanation"])
    def test_model_info_requires_token_when_configured(self, monkeypatch, path):
        set_token(monkeypatch, TOKEN)
        assert client.get(path).status_code == 401
        assert client.get(path, headers={"X-Internal-Token": TOKEN}).status_code == 200

    def test_health_is_always_open(self, monkeypatch):
        set_token(monkeypatch, TOKEN)
        assert client.get("/health").status_code == 200


class TestTrainingLock:
    @pytest.mark.parametrize("path", GUARDED)
    def test_second_job_gets_409_while_one_is_running(self, monkeypatch, stub_training, path):
        set_token(monkeypatch, TOKEN)
        assert main_module._train_lock.acquire(blocking=False)
        try:
            res = client.post(path, json={}, headers={"X-Internal-Token": TOKEN})
            assert res.status_code == 409
            assert stub_training == {"train": 0, "save": 0, "retrain": 0}
        finally:
            main_module._train_lock.release()

    @pytest.mark.parametrize("path", GUARDED)
    def test_lock_is_released_after_success(self, monkeypatch, path):
        set_token(monkeypatch, TOKEN)
        client.post(path, json={}, headers={"X-Internal-Token": TOKEN})
        assert not main_module._train_lock.locked()

    def test_lock_is_released_after_failure(self, monkeypatch):
        set_token(monkeypatch, TOKEN)

        def boom(*_a, **_k):
            raise RuntimeError("training failed")

        monkeypatch.setattr(main_module, "train", boom)
        failing = TestClient(main_module.app, raise_server_exceptions=False)
        res = failing.post("/train", json={}, headers={"X-Internal-Token": TOKEN})
        assert res.status_code == 500
        assert not main_module._train_lock.locked()


class TestRequestBounds:
    @pytest.mark.parametrize("samples", [0, 10, 20001, 10**9])
    def test_sample_count_is_bounded(self, monkeypatch, stub_training, samples):
        set_token(monkeypatch, TOKEN)
        res = client.post("/train", json={"samples": samples}, headers={"X-Internal-Token": TOKEN})
        assert res.status_code == 422
        assert stub_training["train"] == 0

    def test_valid_sample_count_is_accepted(self, monkeypatch):
        set_token(monkeypatch, TOKEN)
        res = client.post("/train", json={"samples": 500}, headers={"X-Internal-Token": TOKEN})
        assert res.status_code == 200
