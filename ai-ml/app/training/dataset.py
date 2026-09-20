import numpy as np

from app.utils.constants import ACTIVITY_LEVELS, GENDERS, GOALS

LABEL_NOISE_RATE = 0.07
RANDOM_SEED = 42


def label_row(row: dict) -> str:
    sleep = row["sleep_hours"]
    hydration = row["water_ml"] / row["water_target_ml"]
    exercise = row["exercise_minutes"]
    steps = row["steps"]
    bmi = row["bmi"]
    goal = row["goal"]
    if sleep < 6.0:
        return "sleep_focus"
    if hydration < 0.6:
        return "hydration_focus"
    if exercise < 12 and steps < 4500:
        return "activity_focus"
    if bmi >= 25 or bmi < 18.5:
        return "weight_management"
    if goal in ("improve_fitness", "muscle_building", "weight_gain"):
        return "fitness_improvement"
    return "balanced_wellness"


def generate_raw_rows(n_samples: int = 3000, seed: int = RANDOM_SEED) -> list[dict]:
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n_samples):
        gender = str(rng.choice(GENDERS, p=[0.46, 0.46, 0.08]))
        age = int(rng.integers(16, 70))
        height = float(rng.normal(170 if gender == "male" else 160, 9))
        height = float(np.clip(height, 140, 200))
        weight = float(np.clip(rng.normal(68, 15), 38, 140))
        bmi = weight / ((height / 100) ** 2)
        activity_level = str(rng.choice(ACTIVITY_LEVELS, p=[0.3, 0.32, 0.26, 0.12]))
        goal = str(rng.choice(GOALS))
        water_target = weight * 35 + {"sedentary": 0, "light": 250, "moderate": 500, "active": 750}[activity_level]
        calorie_target = float(np.clip(rng.normal(2100, 350), 1300, 3200))
        rows.append({
            "bmi": round(bmi, 2),
            "age": age,
            "gender": gender,
            "weight_kg": round(weight, 1),
            "activity_level": activity_level,
            "goal": goal,
            "sleep_hours": round(float(np.clip(rng.normal(6.8, 1.3), 3, 10)), 2),
            "water_ml": int(np.clip(rng.normal(water_target * 0.8, 700), 200, 5000)),
            "water_target_ml": int(water_target),
            "exercise_minutes": int(np.clip(rng.gamma(2.0, 14), 0, 150)),
            "steps": int(np.clip(rng.normal(6500, 3200), 300, 22000)),
            "calories": int(np.clip(rng.normal(calorie_target, 350), 900, 4000)),
            "calorie_target": int(calorie_target),
            "stress_level": int(rng.integers(1, 6)),
        })
    return rows


def generate_dataset(n_samples: int = 3000, seed: int = RANDOM_SEED):
    rng = np.random.default_rng(seed + 1)
    rows = generate_raw_rows(n_samples, seed)
    labels = []
    categories = sorted({label_row(r) for r in rows})
    for row in rows:
        label = label_row(row)
        if rng.random() < LABEL_NOISE_RATE:
            label = str(rng.choice(categories))
        labels.append(label)
    return rows, labels
