import pandas as pd

from app.features.engineering import FEATURE_NAMES, build_feature_row
from app.utils.constants import SLEEP_TARGET_HOURS

IMPUTATION_DEFAULTS = {
    "sleep_hours": SLEEP_TARGET_HOURS,
    "water_ml": None,
    "exercise_minutes": 0,
    "steps": 0,
    "calories": None,
    "stress_level": 3,
}


def impute_raw(raw: dict) -> dict:
    filled = dict(raw)
    for key, default in IMPUTATION_DEFAULTS.items():
        if filled.get(key) is None:
            filled[key] = default
    if filled.get("water_ml") is None:
        filled["water_ml"] = filled.get("water_target_ml") or 2500
    if filled.get("calories") is None:
        filled["calories"] = filled.get("calorie_target") or 2000
    return filled


def build_dataframe(raw_rows: list[dict]) -> pd.DataFrame:
    rows = [build_feature_row(impute_raw(r)) for r in raw_rows]
    return pd.DataFrame(rows, columns=FEATURE_NAMES)


def normalise(df: pd.DataFrame) -> pd.DataFrame:
    ranges = df.max() - df.min()
    ranges = ranges.replace(0, 1)
    return (df - df.min()) / ranges
