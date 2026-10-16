"""User-disjoint AND temporal splits with a purge gap."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.adherence.schema import PURGE_GAP_DAYS


def split_users(user_ids, seed: int = 0, fractions=(0.70, 0.15, 0.15)) -> dict[str, set]:
    ids = np.array(sorted(set(int(u) for u in user_ids)))
    rng = np.random.default_rng(seed)
    rng.shuffle(ids)
    n_train = int(round(fractions[0] * len(ids)))
    n_val = int(round(fractions[1] * len(ids)))
    return {"train": set(ids[:n_train].tolist()),
            "val": set(ids[n_train:n_train + n_val].tolist()),
            "test": set(ids[n_train + n_val:].tolist())}


def make_splits(examples: pd.DataFrame, seed: int = 0, fractions=(0.70, 0.15, 0.15),
                gap: int = PURGE_GAP_DAYS, t_quantiles=(0.5, 0.75)) -> dict[str, pd.DataFrame]:
    """Observed examples only.

    train: train users, T <= t_a;  val: val users, t_a+gap <= T <= t_b;
    test: test users, T >= t_b+gap.  Raises if any invariant is violated.
    """
    ex = examples[examples["observed"]].copy()
    ts = np.sort(ex["T"].unique())
    t_a = int(ts[int(t_quantiles[0] * (len(ts) - 1))])
    t_b = int(ts[int(t_quantiles[1] * (len(ts) - 1))])
    groups = split_users(examples["user_id"].unique(), seed, fractions)
    out = {
        "train": ex[ex["user_id"].isin(groups["train"]) & (ex["T"] <= t_a)],
        "val": ex[ex["user_id"].isin(groups["val"]) & (ex["T"] >= t_a + gap) & (ex["T"] <= t_b)],
        "test": ex[ex["user_id"].isin(groups["test"]) & (ex["T"] >= t_b + gap)],
    }
    check_splits(out, gap)
    return out


def check_splits(splits: dict[str, pd.DataFrame], gap: int = PURGE_GAP_DAYS) -> None:
    names = list(splits)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            shared = set(splits[a]["user_id"]) & set(splits[b]["user_id"])
            if shared:
                raise AssertionError(f"user leakage between {a} and {b}: {len(shared)} users")
    for earlier, later in (("train", "val"), ("val", "test"), ("train", "test")):
        if len(splits[earlier]) and len(splits[later]):
            if splits[later]["T"].min() - splits[earlier]["T"].max() < gap:
                raise AssertionError(f"purge gap violated between {earlier} and {later}")
