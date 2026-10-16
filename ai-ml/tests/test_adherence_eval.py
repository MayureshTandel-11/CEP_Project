import numpy as np
import pytest

from app.adherence.evaluate import acceptance, cluster_bootstrap, metrics
from app.adherence.schema import SyntheticDataError
from app.adherence.simulate import simulate
from app.adherence.train import run


def test_metrics_known_values():
    y = [1, 1, 1, 0, 0, 0, 0, 0]
    pred = [1, 1, 0, 0, 0, 0, 0, 1]
    m = metrics(y, pred, [.9, .8, .4, .1, .2, .1, .3, .6])
    assert m["recall_adhered"] == pytest.approx(2 / 3)
    assert m["recall_not_adhered"] == pytest.approx(4 / 5)
    assert m["macro_f1"] == pytest.approx((0.6667 + 0.8) / 2, abs=1e-3)
    assert 0 <= m["brier"] <= 1 and m["roc_auc"] > 0.9


def test_majority_class_has_zero_minority_recall():
    y = np.array([1] * 20 + [0] * 80)
    m = metrics(y, np.zeros(100, int))
    assert m["recall_adhered"] == 0 and m["macro_f1"] < 0.5


def test_bootstrap_resamples_users_and_ci_contains_point_estimate():
    rng = np.random.default_rng(0)
    users = np.repeat(np.arange(60), 5)
    y = rng.integers(0, 2, 300)
    good = np.where(rng.random(300) < 0.85, y, 1 - y)
    bad = rng.integers(0, 2, 300)
    b = cluster_bootstrap(y, {"model": good, "ref": bad}, users, "ref", "model", n_boot=300, seed=1)
    assert b["n_users"] == 60
    lo, hi = b["paired_diff_ci"]
    assert lo > 0 and hi > lo


def test_acceptance_never_passes_on_synthetic():
    model = dict(macro_f1=0.8, positive_rate=0.5, recall_adhered=.8, recall_not_adhered=.8)
    base = dict(macro_f1=0.6, positive_rate=0.5, recall_adhered=.6, recall_not_adhered=.6)
    assert acceptance(model, base, [0.1, 0.3], "synthetic")["verdict"] == "NOT_APPLICABLE_SYNTHETIC"
    a = acceptance(model, base, [0.1, 0.3], "real")
    assert a["verdict"] == "PASS"
    assert acceptance(model, base, [-0.01, 0.3], "real")["verdict"] == "FAIL"
    tiny = dict(base, macro_f1=0.79)
    assert acceptance(model, tiny, [0.01, 0.02], "real")["verdict"] == "FAIL"  # gain < 0.03


def test_run_refuses_synthetic_without_opt_in():
    with pytest.raises(SyntheticDataError):
        run(simulate(30, 56, 1), "synthetic", allow_synthetic=False)


@pytest.fixture(scope="module")
def report():
    return run(simulate(1200, 112, 5), "synthetic", allow_synthetic=True, seed=5, n_boot=200)


def test_report_is_stamped_synthetic_and_not_accepted(report):
    assert report["data_origin"] == "synthetic" and "NOT evidence" in report["disclaimer"]
    assert report["acceptance"]["verdict"] == "NOT_APPLICABLE_SYNTHETIC"


def test_shuffled_label_canary_is_near_chance(report):
    c = report["shuffled_label_canary"]
    assert abs(c["roc_auc"] - 0.5) < 0.08
    assert c["macro_f1"] < report["test_results"]["model"]["macro_f1"]


def test_test_users_never_in_train(report):
    assert set(report["split_sizes"]) == {"train", "val", "test"}
    assert all(v > 0 for v in report["users_per_split"].values())
