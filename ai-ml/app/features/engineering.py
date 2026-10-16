import math

from app.utils.constants import (
    ACTIVITY_SCORES, EXERCISE_MINUTES_TARGET, GOALS, GENDERS,
    SLEEP_TARGET_HOURS, STEPS_TARGET,
)

FEATURE_NAMES = [
    "bmi", "age", "activity_score", "sleep_hours", "sleep_adequacy",
    "hydration_ratio", "hydration_adequacy", "exercise_minutes", "exercise_adequacy",
    "steps_ratio", "calorie_ratio", "stress_level", "goal_code", "gender_code",
]

FEATURE_DESCRIPTIONS = {
    "bmi": "Body Mass Index computed from height and weight",
    "age": "Age in years",
    "activity_score": "Self-reported activity level mapped to 1 (sedentary) - 4 (active)",
    "sleep_hours": "Average logged sleep hours per night",
    "sleep_adequacy": "1 if average sleep meets the 7 h guideline, else 0",
    "hydration_ratio": "Average logged water intake divided by the personal water target",
    "hydration_adequacy": "1 if hydration ratio is at least 0.9, else 0",
    "exercise_minutes": "Average logged exercise minutes per day",
    "exercise_adequacy": "1 if average exercise meets the 30 min/day target, else 0",
    "steps_ratio": "Average logged steps divided by the 8000 step target",
    "calorie_ratio": "Average logged calorie intake divided by the personal calorie target",
    "stress_level": "Self-reported stress on a 1-5 scale",
    "goal_code": "Wellness goal encoded as an integer index",
    "gender_code": "Gender encoded as an integer index",
}

GOAL_CODES = {goal: i for i, goal in enumerate(GOALS)}
GENDER_CODES = {g: i for i, g in enumerate(GENDERS)}


def round_half_up(value: float, decimals: int) -> float:
    """Round half up using plain IEEE-754 operations.

    Mirrors roundHalfUp() in backend/src/services/featureBuilder.js so both languages
    produce bit-identical values. Do not use Python's round(): it rounds ties to even.
    """
    factor = float(10 ** decimals)
    return math.floor(float(value) * factor + 0.5) / factor


def build_feature_row(raw: dict) -> dict:
    water_target = raw.get("water_target_ml") or 2500
    calorie_target = raw.get("calorie_target") or 2000
    sleep_raw = raw.get("sleep_hours")
    sleep_hours = float(SLEEP_TARGET_HOURS if sleep_raw is None else sleep_raw)
    hydration_ratio = (raw.get("water_ml") or 0) / water_target
    exercise_minutes = raw.get("exercise_minutes") or 0
    steps_ratio = (raw.get("steps") or 0) / STEPS_TARGET
    calorie_ratio = (raw.get("calories") or calorie_target) / calorie_target
    # Stress is a 1-5 scale: round (not truncate) an average, then clamp.
    stress_raw = raw.get("stress_level")
    stress = 3 if stress_raw is None else int(min(5, max(1, round_half_up(stress_raw, 0))))
    return {
        "bmi": round_half_up(raw["bmi"], 2),
        "age": int(raw["age"]),
        "activity_score": ACTIVITY_SCORES.get(raw.get("activity_level"), 2),
        "sleep_hours": round_half_up(sleep_hours, 2),
        "sleep_adequacy": int(sleep_hours >= SLEEP_TARGET_HOURS),
        "hydration_ratio": round_half_up(hydration_ratio, 3),
        "hydration_adequacy": int(hydration_ratio >= 0.9),
        "exercise_minutes": round_half_up(exercise_minutes, 1),
        "exercise_adequacy": int(exercise_minutes >= EXERCISE_MINUTES_TARGET),
        "steps_ratio": round_half_up(steps_ratio, 3),
        "calorie_ratio": round_half_up(calorie_ratio, 3),
        "stress_level": stress,
        "goal_code": GOAL_CODES.get(raw.get("goal"), GOAL_CODES["general_wellness"]),
        "gender_code": GENDER_CODES.get(raw.get("gender"), GENDER_CODES["other"]),
    }


def to_vector(features: dict) -> list[float]:
    return [float(features[name]) for name in FEATURE_NAMES]
