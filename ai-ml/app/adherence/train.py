"""Train + evaluate the adherence model against baselines on user-disjoint, temporal splits.

    python -m app.adherence.train --allow-synthetic --users 4000 --seed 7 --out report.json

Protocol: fit on train; choose the decision threshold on validation; evaluate on test ONCE.
Also runs a shuffled-label canary. Reports are stamped with the data origin and disclaimer.
"""
from __future__ import annotations

import argparse
import json

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from app.adherence.evaluate import (acceptance, baseline_predictions, cluster_bootstrap, metrics)
from app.adherence.features import FEATURE_COLUMNS, build_examples
from app.adherence.schema import (SYNTHETIC, SYNTHETIC_DISCLAIMER, require_synthetic_opt_in)
from app.adherence.simulate import simulate
from app.adherence.splits import make_splits

RF_PARAMS = dict(n_estimators=300, min_samples_leaf=5, class_weight="balanced",
                 random_state=0, n_jobs=1)


def _fit(train, labels=None):
    y = train["adhered_7d"].to_numpy(int) if labels is None else labels
    return RandomForestClassifier(**RF_PARAMS).fit(train[FEATURE_COLUMNS], y)


def _best_threshold(y, p) -> float:
    from sklearn.metrics import f1_score
    grid = np.linspace(0.2, 0.8, 25)
    scores = [f1_score(y, (p >= t).astype(int), average="macro", labels=[0, 1], zero_division=0)
              for t in grid]
    return float(grid[int(np.argmax(scores))])


def run(tables: dict, data_origin: str, allow_synthetic: bool, seed: int = 0,
        n_boot: int = 1000) -> dict:
    require_synthetic_opt_in(data_origin, allow_synthetic)
    ex = build_examples(tables["users"], tables["daily_logs"], tables["snapshots"])
    splits = make_splits(ex, seed=seed)
    train, val, test = splits["train"], splits["val"], splits["test"]
    for name, s in splits.items():
        if s["adhered_7d"].nunique() < 2:
            raise ValueError(f"{name} split has a single class; too little data")

    model = _fit(train)
    thr = _best_threshold(val["adhered_7d"].to_numpy(int),
                          model.predict_proba(val[FEATURE_COLUMNS])[:, 1])
    # ---- test split is used from here on, with model and threshold frozen ----
    yt = test["adhered_7d"].to_numpy(int)
    proba = model.predict_proba(test[FEATURE_COLUMNS])[:, 1]
    preds = baseline_predictions(train, test)
    preds["model"] = (proba >= thr).astype(int)

    results = {n: metrics(yt, p, proba if n == "model" else None) for n, p in preds.items()}
    best = max((n for n in preds if n != "model"), key=lambda n: results[n]["macro_f1"])
    boot = cluster_bootstrap(yt, preds, test["user_id"], ref=best, model="model",
                             n_boot=n_boot, seed=seed)

    # ---- canary: shuffled training labels must score near chance on test ----
    rng = np.random.default_rng(seed + 1)
    shuf = _fit(train, rng.permutation(train["adhered_7d"].to_numpy(int)))
    sp = shuf.predict_proba(test[FEATURE_COLUMNS])[:, 1]
    canary = metrics(yt, (sp >= 0.5).astype(int), sp)

    imp = sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda kv: -kv[1])
    obs = ex["observed"]
    return {
        "data_origin": data_origin,
        "disclaimer": SYNTHETIC_DISCLAIMER if data_origin == SYNTHETIC else "",
        "seed": seed, "threshold_chosen_on_validation": thr,
        "split_sizes": {k: int(len(v)) for k, v in splits.items()},
        "users_per_split": {k: int(v["user_id"].nunique()) for k, v in splits.items()},
        "observed_fraction": float(obs.mean()),
        "unobserved_note": "Snapshots with <4 logged outcome days are excluded; if missingness "
                           "relates to adherence the observed set is biased.",
        "mean_win_log_days_observed_vs_not": [float(ex[obs]["win_log_days"].mean()),
                                              float(ex[~obs]["win_log_days"].mean())],
        "test_results": results, "best_baseline": best, "bootstrap": boot,
        "shuffled_label_canary": canary,
        "feature_importances": [{"feature": f, "importance": float(i)} for f, i in imp],
        "acceptance": acceptance(results["model"], results[best],
                                 boot["paired_diff_ci"], data_origin),
    }


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--users", type=int, default=4000)
    ap.add_argument("--days", type=int, default=112)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--n-boot", type=int, default=1000)
    ap.add_argument("--allow-synthetic", action="store_true")
    ap.add_argument("--out", default="adherence_report.json")
    a = ap.parse_args(argv)
    require_synthetic_opt_in(SYNTHETIC, a.allow_synthetic)
    report = run(simulate(a.users, a.days, a.seed), SYNTHETIC, True, a.seed, a.n_boot)
    with open(a.out, "w") as f:
        json.dump(report, f, indent=1)
    print(report["disclaimer"])
    print(json.dumps({k: report[k] for k in ("split_sizes", "best_baseline", "acceptance")}, indent=1))


if __name__ == "__main__":
    main()
