"""Seeded SYNTHETIC generator for plan-adherence data.

Everything here is an authors' assumption, not a measurement of real people. Hidden latent
traits (motivation, consistency) are never written to the output. Labels are not generated
directly: they are computed from the simulated daily logs by schema.label_adherence, exactly as
they would be from real logs.

    python -m app.adherence.simulate --out data/adherence_synth --allow-synthetic
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from app.adherence.schema import SYNTHETIC, require_synthetic_opt_in

LEVELS = ["sedentary", "light", "moderate", "active"]
ACTIVITY_SCORE = {"sedentary": 1, "light": 2, "moderate": 3, "active": 4}
GOALS = ["weight_loss", "weight_gain", "muscle_building", "maintain_weight",
         "improve_fitness", "improve_sleep", "general_wellness"]
PLAN_MINUTES = {"sedentary": 20, "light": 25, "moderate": 30, "active": 40}
GOAL_EXTRA = {"weight_loss": 5, "improve_fitness": 5, "muscle_building": 5}
FIRST_T = 6
STEP = 7


def planned_minutes(level: str, goal: str) -> int:
    """Rule-style plan: depends only on the profile, never on motivation."""
    return PLAN_MINUTES[level] + GOAL_EXTRA.get(goal, 0)


def simulate(n_users: int = 4000, n_days: int = 112, seed: int = 7) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    n_weeks = n_days // STEP

    age = rng.integers(16, 66, n_users)
    gender = rng.choice(["male", "female", "other"], n_users, p=[0.48, 0.48, 0.04])
    level = rng.choice(LEVELS, n_users, p=[0.25, 0.35, 0.28, 0.12])
    goal = rng.choice(GOALS, n_users)
    bmi = np.clip(rng.normal(24.5, 4.2, n_users), 15, 45).round(1)
    act = np.array([ACTIVITY_SCORE[x] for x in level])

    # Hidden latents. Motivation drifts weekly (so last week predicts, but imperfectly).
    motivation0 = rng.normal(0, 1, n_users)
    drift = rng.normal(0, 0.35, (n_users, n_weeks)).cumsum(axis=1)
    motivation = motivation0[:, None] + drift                     # users x weeks
    phi = rng.uniform(0.2, 0.7, n_users)                          # day-to-day persistence
    base = 12 + 3.5 * act - 0.3 * np.maximum(bmi - 27, 0)         # minutes/day before motivation
    log_bias = rng.normal(0, 0.5, n_users)

    users = pd.DataFrame({
        "user_id": np.arange(n_users), "age": age, "gender": gender, "bmi": bmi,
        "activity_level": level, "goal": goal, "data_origin": SYNTHETIC,
    })

    rows = []
    days = np.arange(n_days)
    week = np.minimum(days // STEP, n_weeks - 1)
    for u in range(n_users):
        m = motivation[u, week]                                    # per-day motivation
        mean_ex = np.maximum(base[u] + 9.0 * m, 0)
        noise = rng.normal(0, 9.0, n_days)
        ex = np.empty(n_days)
        prev = mean_ex[0]
        for d in range(n_days):                                     # AR(1) around the mean
            prev = mean_ex[d] + phi[u] * (prev - mean_ex[d]) + noise[d]
            ex[d] = max(prev, 0.0)
        rest = rng.random(n_days) < 0.12
        ex[rest] = 0.0

        sleep = np.clip(rng.normal(7.0 + 0.25 * m, 1.0), 3, 11)
        water = np.clip(rng.normal(2000 + 180 * m, 500), 200, 5000)
        steps = np.clip(rng.normal(5500 + 1400 * m + 25 * ex, 1800), 0, 25000)
        stress = np.clip(np.rint(3 - 0.45 * m + rng.normal(0, 0.9, n_days)), 1, 5)

        # Informative missingness: motivated users log more days.
        p_log = 1 / (1 + np.exp(-(0.2 + 0.9 * m + log_bias[u])))
        logged = rng.random(n_days) < p_log
        fields = {"sleep_hours": sleep, "water_ml": water, "steps": steps,
                  "exercise_minutes": ex, "stress_level": stress}
        frame = {"user_id": u, "day": days}
        for name, arr in fields.items():
            vals = arr.astype(float).copy()
            vals[rng.random(n_days) < 0.08] = np.nan               # field-level gaps
            frame[name] = vals
        rows.append(pd.DataFrame(frame)[logged])
    logs = pd.concat(rows, ignore_index=True)
    logs["data_origin"] = SYNTHETIC
    for c in ("sleep_hours", "water_ml", "steps", "exercise_minutes"):
        logs[c] = logs[c].round(1)

    ts = np.arange(FIRST_T, n_days - 7, STEP)
    snaps = users[["user_id", "activity_level", "goal"]].merge(
        pd.DataFrame({"T": ts}), how="cross")
    snaps["planned_daily_minutes"] = [planned_minutes(a, g) for a, g in
                                      zip(snaps["activity_level"], snaps["goal"])]
    snaps = snaps[["user_id", "T", "planned_daily_minutes"]].assign(data_origin=SYNTHETIC)
    return {"users": users, "daily_logs": logs, "snapshots": snaps}


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", required=True)
    ap.add_argument("--users", type=int, default=4000)
    ap.add_argument("--days", type=int, default=112)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--allow-synthetic", action="store_true")
    a = ap.parse_args(argv)
    require_synthetic_opt_in(SYNTHETIC, a.allow_synthetic)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, df in simulate(a.users, a.days, a.seed).items():
        df.to_csv(out / f"{name}.csv", index=False)
    (out / "DATA_ORIGIN.txt").write_text(
        f"synthetic\nseed={a.seed} users={a.users} days={a.days}\n"
        "Generated by app.adherence.simulate. Not real user data.\n")
    print(f"wrote synthetic dataset to {out}")


if __name__ == "__main__":
    main()
