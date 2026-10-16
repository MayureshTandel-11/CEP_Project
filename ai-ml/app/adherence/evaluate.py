"""Metrics, baselines, user-clustered bootstrap and the pre-registered acceptance rule."""
from __future__ import annotations

import numpy as np
from sklearn.metrics import (average_precision_score, balanced_accuracy_score, brier_score_loss,
                             f1_score, recall_score, roc_auc_score)

# --- Pre-registered acceptance criteria (fixed before any model run; see design doc) -----
ACCEPT_MIN_MACRO_F1_GAIN = 0.03
ACCEPT_CI_LEVEL = 0.95
N_BOOT = 1000


def metrics(y, pred, proba=None) -> dict:
    y, pred = np.asarray(y, int), np.asarray(pred, int)
    rec = recall_score(y, pred, labels=[0, 1], average=None, zero_division=0)
    out = {
        "n": int(len(y)), "positive_rate": float(y.mean()),
        "macro_f1": float(f1_score(y, pred, average="macro", labels=[0, 1], zero_division=0)),
        "recall_not_adhered": float(rec[0]), "recall_adhered": float(rec[1]),
        "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
    }
    if proba is not None and len(set(y)) == 2:
        p = np.asarray(proba, float)
        out.update(pr_auc=float(average_precision_score(y, p)), roc_auc=float(roc_auc_score(y, p)),
                   brier=float(brier_score_loss(y, p)), calibration=calibration_bins(y, p))
    return out


def calibration_bins(y, p, n_bins: int = 10) -> list[dict]:
    y, p = np.asarray(y, float), np.asarray(p, float)
    edges = np.linspace(0, 1, n_bins + 1)
    rows = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & ((p < hi) if hi < 1 else (p <= hi))
        if m.any():
            rows.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(m.sum()),
                         "mean_pred": float(p[m].mean()), "observed_rate": float(y[m].mean())})
    return rows


def baseline_predictions(train, test) -> dict[str, np.ndarray]:
    majority = int(train["adhered_7d"].mean() >= 0.5)
    persistence = test["prev_adhered"].fillna(majority).to_numpy(int)
    rule = (test["win_exercise_ratio"].fillna(0.0) >= 0.8).to_numpy(int)
    return {"majority": np.full(len(test), majority), "persistence": persistence, "rule": rule}


def _macro_f1(y, pred) -> float:
    return float(f1_score(y, pred, average="macro", labels=[0, 1], zero_division=0))


def cluster_bootstrap(y, preds: dict[str, np.ndarray], users, ref: str, model: str,
                      n_boot: int = N_BOOT, seed: int = 0, level: float = ACCEPT_CI_LEVEL) -> dict:
    """Resample USERS (not rows) with replacement. Returns CIs for each system's macro-F1 and
    the paired difference model - ref (same resample for both)."""
    y, users = np.asarray(y), np.asarray(users)
    uniq = np.unique(users)
    idx_by_user = {u: np.flatnonzero(users == u) for u in uniq}
    rng = np.random.default_rng(seed)
    names = list(preds)
    samples = {n: [] for n in names}
    diffs = []
    for _ in range(n_boot):
        pick = rng.choice(uniq, size=len(uniq), replace=True)
        idx = np.concatenate([idx_by_user[u] for u in pick])
        f = {n: _macro_f1(y[idx], preds[n][idx]) for n in names}
        for n in names:
            samples[n].append(f[n])
        diffs.append(f[model] - f[ref])
    a = (1 - level) / 2
    q = lambda v: [float(np.quantile(v, a)), float(np.quantile(v, 1 - a))]  # noqa: E731
    return {"macro_f1_ci": {n: q(samples[n]) for n in names},
            "paired_diff_ci": q(diffs), "paired_diff_mean": float(np.mean(diffs)),
            "n_users": int(len(uniq)), "n_boot": n_boot}


def acceptance(model_m: dict, best_base_m: dict, paired_ci, data_origin: str) -> dict:
    gain = model_m["macro_f1"] - best_base_m["macro_f1"]
    minority = "recall_adhered" if model_m["positive_rate"] <= 0.5 else "recall_not_adhered"
    checks = {
        "macro_f1_gain>=0.03": gain >= ACCEPT_MIN_MACRO_F1_GAIN,
        "paired_ci_excludes_0": paired_ci[0] > 0,
        "minority_recall_not_worse": model_m[minority] >= best_base_m[minority],
    }
    passed = all(checks.values())
    if data_origin != "real":
        verdict = "NOT_APPLICABLE_SYNTHETIC"   # synthetic results can never satisfy acceptance
    else:
        verdict = "PASS" if passed else "FAIL"
    return {"verdict": verdict, "checks": checks, "would_pass_if_real": passed,
            "macro_f1_gain": float(gain), "minority_class": minority}
