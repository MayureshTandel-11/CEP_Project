"""Label rule, determinism, synthetic guard, temporal-leakage audit and split invariants."""
import numpy as np
import pandas as pd
import pytest

from app.adherence.features import FEATURE_COLUMNS, audit_future_dependence, build_examples
from app.adherence.schema import SyntheticDataError, label_adherence, require_synthetic_opt_in
from app.adherence.simulate import simulate
from app.adherence.splits import check_splits, make_splits, split_users

NAN = float("nan")


@pytest.fixture(scope="module")
def data():
    return simulate(n_users=400, n_days=112, seed=11)


@pytest.fixture(scope="module")
def examples(data):
    return build_examples(data["users"], data["daily_logs"], data["snapshots"])


# ---- labelling rule ------------------------------------------------------------------
def test_label_requires_four_logged_days():
    assert label_adherence([30, 30, 30, None, None, None, None], 30) == (False, None)
    assert label_adherence([30, 30, 30, 30, NAN, NAN, NAN], 30) == (True, 1)


def test_label_threshold_is_80_percent_of_plan():
    assert label_adherence([24] * 7, 30) == (True, 1)      # exactly 0.8 * 30
    assert label_adherence([23.9] * 7, 30) == (True, 0)


def test_unlogged_days_are_not_counted_as_zero():
    assert label_adherence([30, 30, 30, 30, None, None, None], 30) == (True, 1)


# ---- generator -----------------------------------------------------------------------
def test_generator_is_deterministic_and_seed_sensitive():
    a, b, c = simulate(60, 56, 3), simulate(60, 56, 3), simulate(60, 56, 4)
    pd.testing.assert_frame_equal(a["daily_logs"], b["daily_logs"])
    assert not a["daily_logs"].equals(c["daily_logs"])


def test_every_table_is_marked_synthetic_and_latents_not_exposed(data):
    for df in data.values():
        if "data_origin" in df:
            assert set(df["data_origin"]) == {"synthetic"}
        assert not any("motivation" in c or "latent" in c for c in df.columns)


def test_refuses_synthetic_without_opt_in():
    with pytest.raises(SyntheticDataError):
        require_synthetic_opt_in("synthetic", False)
    require_synthetic_opt_in("synthetic", True)
    require_synthetic_opt_in("real", False)


def test_missingness_is_present_and_label_has_both_classes(examples):
    assert 0.2 < examples["observed"].mean() < 0.9      # some snapshots unobserved
    obs = examples[examples["observed"]]
    assert 0.2 < obs["adhered_7d"].mean() < 0.8
    assert examples[~examples["observed"]]["adhered_7d"].isna().all()
    assert examples[FEATURE_COLUMNS].isna().any().any()  # NaN kept, not imputed


# ---- temporal leakage ----------------------------------------------------------------
def test_features_do_not_depend_on_future_logs(data):
    v = audit_future_dependence(build_examples, data["users"], data["daily_logs"],
                                data["snapshots"], n_checks=60)
    assert v == []


def test_audit_detects_a_deliberately_leaky_feature(data):
    """Canary: a feature built from the outcome window MUST be flagged."""
    def leaky_build(users, logs, snaps):
        ex = build_examples(users, logs, snaps)
        fut = []
        for _, r in ex.iterrows():
            g = logs[(logs["user_id"] == r["user_id"]) & (logs["day"] > r["T"])
                     & (logs["day"] <= r["T"] + 7)]["exercise_minutes"]
            fut.append(g.mean())
        ex["future_exercise_mean"] = fut
        return ex
    small = data["snapshots"][data["snapshots"]["user_id"] < 40]
    v = audit_future_dependence(leaky_build, data["users"], data["daily_logs"], small, n_checks=40)
    assert any(x["feature"] == "future_exercise_mean" for x in v)


def test_prev_adhered_only_uses_windows_that_have_ended(examples):
    ex = examples.sort_values(["user_id", "T"])
    first = ex.groupby("user_id").head(1)
    assert first["prev_adhered"].isna().all()           # nothing is known before the first plan


# ---- splits --------------------------------------------------------------------------
def test_splits_are_user_disjoint_and_time_separated(examples):
    s = make_splits(examples, seed=1)
    assert all(len(v) > 0 for v in s.values())
    check_splits(s)
    assert s["val"]["T"].min() - s["train"]["T"].max() > 7
    assert s["test"]["T"].min() - s["val"]["T"].max() > 7
    assert set(s["train"]["user_id"]).isdisjoint(s["test"]["user_id"])


def test_check_splits_catches_user_overlap_and_time_overlap(examples):
    s = make_splits(examples, seed=1)
    bad = dict(s)
    bad["test"] = pd.concat([s["test"], s["train"].head(1)])
    with pytest.raises(AssertionError):
        check_splits(bad)
    tr = s["train"].copy()
    te = s["test"].copy()
    te["T"] = tr["T"].max() + 1
    with pytest.raises(AssertionError):
        check_splits({"train": tr, "val": s["val"].iloc[0:0], "test": te})


def test_split_users_fractions_and_determinism():
    ids = range(1000)
    a, b = split_users(ids, 5), split_users(ids, 5)
    assert a == b
    assert (len(a["train"]), len(a["val"]), len(a["test"])) == (700, 150, 150)
    assert split_users(ids, 6) != a


def test_cli_refuses_without_flag(tmp_path):
    from app.adherence.simulate import main
    with pytest.raises(SyntheticDataError):
        main(["--out", str(tmp_path)])           # no --allow-synthetic
