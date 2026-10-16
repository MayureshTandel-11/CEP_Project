"""Examples (features + label) from users / daily_logs / snapshots.

Features use ONLY days <= T. Missing values stay NaN.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.adherence.schema import FEATURE_WINDOW_DAYS, OUTCOME_DAYS, label_adherence

ACTIVITY_SCORE = {"sedentary": 1, "light": 2, "moderate": 3, "active": 4}
GOAL_CODES = {g: i for i, g in enumerate([
    "weight_loss", "weight_gain", "muscle_building", "maintain_weight",
    "improve_fitness", "improve_sleep", "general_wellness"])}
FIELDS = ["sleep_hours", "water_ml", "steps", "exercise_minutes", "stress_level"]

FEATURE_COLUMNS = [
    "bmi", "age", "activity_score", "goal_code", "planned_daily_minutes",
    "win_log_days", "win_sleep_mean", "win_water_ratio_mean", "win_steps_ratio_mean",
    "win_exercise_mean", "win_exercise_ratio", "win_stress_mean", "prev_adhered",
]
WATER_TARGET_ML = 2500.0
STEPS_TARGET = 8000.0


def _dense(logs: pd.DataFrame, n_days: int) -> dict[int, np.ndarray]:
    """user_id -> array (n_days, len(FIELDS)) with NaN where nothing was logged."""
    out: dict[int, np.ndarray] = {}
    for uid, g in logs.groupby("user_id"):
        arr = np.full((n_days, len(FIELDS)), np.nan)
        arr[g["day"].to_numpy(int)] = g[FIELDS].to_numpy(float)
        out[int(uid)] = arr
    return out


def _nanmean(a: np.ndarray) -> float:
    a = a[~np.isnan(a)]
    return float(a.mean()) if a.size else float("nan")


def compute_features(user: dict, dense: np.ndarray, T: int, planned: float,
                     prev_adhered: float) -> dict:
    """Features for one snapshot. Reads dense[T-6 : T+1] and nothing after T."""
    lo = max(T - FEATURE_WINDOW_DAYS + 1, 0)
    win = dense[lo:T + 1]
    ex_mean = _nanmean(win[:, FIELDS.index("exercise_minutes")])
    logged_any = ~np.isnan(win).all(axis=1)
    return {
        "bmi": float(user["bmi"]), "age": int(user["age"]),
        "activity_score": ACTIVITY_SCORE.get(user["activity_level"], 2),
        "goal_code": GOAL_CODES.get(user["goal"], GOAL_CODES["general_wellness"]),
        "planned_daily_minutes": float(planned),
        "win_log_days": int(logged_any.sum()),
        "win_sleep_mean": _nanmean(win[:, FIELDS.index("sleep_hours")]),
        "win_water_ratio_mean": _nanmean(win[:, FIELDS.index("water_ml")]) / WATER_TARGET_ML,
        "win_steps_ratio_mean": _nanmean(win[:, FIELDS.index("steps")]) / STEPS_TARGET,
        "win_exercise_mean": ex_mean,
        "win_exercise_ratio": ex_mean / planned if planned else float("nan"),
        "win_stress_mean": _nanmean(win[:, FIELDS.index("stress_level")]),
        "prev_adhered": prev_adhered,
    }


def build_examples(users: pd.DataFrame, logs: pd.DataFrame, snapshots: pd.DataFrame,
                   n_days: int | None = None) -> pd.DataFrame:
    """One row per snapshot, with label columns `observed`, `adhered_7d`."""
    if n_days is None:
        n_days = int(max(logs["day"].max() + 1 if len(logs) else 0,
                         snapshots["T"].max() + OUTCOME_DAYS + 1))
    dense = _dense(logs, n_days)
    empty = np.full((n_days, len(FIELDS)), np.nan)
    urec = users.set_index("user_id").to_dict("index")
    ex_i = FIELDS.index("exercise_minutes")

    rows = []
    for uid, g in snapshots.sort_values(["user_id", "T"]).groupby("user_id"):
        arr = dense.get(int(uid), empty)
        user = urec[int(uid)]
        prev_label, prev_T = float("nan"), None
        for T, planned in zip(g["T"].to_numpy(int), g["planned_daily_minutes"].to_numpy(float)):
            # The previous label is only known at T if its outcome window ended by T.
            prev = prev_label if (prev_T is not None and prev_T + OUTCOME_DAYS <= T) else float("nan")
            feats = compute_features(user, arr, T, planned, prev)
            window = arr[T + 1:T + 1 + OUTCOME_DAYS, ex_i]
            observed, adhered = label_adherence(window, planned)
            rows.append({"user_id": int(uid), "T": int(T), **feats,
                         "observed": observed,
                         "adhered_7d": adhered if adhered is not None else np.nan})
            prev_label = float(adhered) if adhered is not None else float("nan")
            prev_T = int(T)
    return pd.DataFrame(rows)


def audit_future_dependence(build_fn, users, logs, snapshots, n_checks: int = 25,
                            seed: int = 0) -> list[dict]:
    """Return violations: features that change when logs after T are removed.

    `build_fn(users, logs, snapshots) -> examples`. For a sample of snapshots the features
    are rebuilt from logs truncated to day <= T and compared with the full-log features.
    A non-empty result means some feature depends on the future (temporal leakage).
    """
    full = build_fn(users, logs, snapshots)
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(full), size=min(n_checks, len(full)), replace=False)
    violations = []
    skip = ("observed", "adhered_7d", "user_id", "T")
    for i in idx:
        r = full.iloc[i]
        T, uid = int(r["T"]), int(r["user_id"])
        trunc = logs[(logs["user_id"] == uid) & (logs["day"] <= T)]
        # Keep the user's earlier snapshots too: prev_adhered legitimately needs them.
        snap = snapshots[(snapshots["user_id"] == uid) & (snapshots["T"] <= T)]
        part = build_fn(users[users["user_id"] == uid], trunc, snap)
        part = part[part["T"] == T].iloc[0]
        for col in [c for c in full.columns if c not in skip]:
            a, b = r[col], part[col]
            if not (a == b or (pd.isna(a) and pd.isna(b))):
                violations.append({"user_id": uid, "T": T, "feature": col})
    return violations
