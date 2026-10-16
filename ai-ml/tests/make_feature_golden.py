"""Generate tests/fixtures/feature_golden.json: shared Python/JS feature-parity vectors.

Expected values come from the Python implementation (app.features.engineering). The JS
test (backend/tests/unit/featureParity.test.js) must reproduce them exactly. Seeded, so
re-running produces an identical file.

    python tests/make_feature_golden.py
"""
import json
import random
from pathlib import Path

from app.features.engineering import build_feature_row

SEED = 20260101
OUT = Path(__file__).parent / "fixtures" / "feature_golden.json"
LEVELS = ["sedentary", "light", "moderate", "active", "very_active", "bogus"]
GOALS = ["weight_loss", "muscle_gain", "maintenance", "general_wellness", "endurance", "bogus"]
GENDERS = ["male", "female", "other", "bogus"]


def base(**kw):
    raw = dict(bmi=22.0, age=30, gender="female", activity_level="moderate", goal="maintenance",
               sleep_hours=7.0, water_ml=2000, water_target_ml=2500, exercise_minutes=20,
               steps=6000, calories=2000, calorie_target=2000, stress_level=3)
    raw.update(kw)
    return raw


def edge_cases():
    return [
        base(water_ml=1625, water_target_ml=2000),           # tie in hydration_ratio (0.8125)
        base(steps=6500, ),                                    # 0.8125 steps tie
        base(steps=1, ),
        base(bmi=22.125), base(bmi=22.135), base(bmi=18.005), base(bmi=30.045),
        base(sleep_hours=6.125), base(sleep_hours=7.005), base(sleep_hours=None),
        base(sleep_hours=0), base(sleep_hours=7.0), base(sleep_hours=6.999),
        base(stress_level=2.5), base(stress_level=3.5), base(stress_level=0.4),
        base(stress_level=7), base(stress_level=None), base(stress_level=4.49),
        base(exercise_minutes=0), base(exercise_minutes=None), base(exercise_minutes=30.05),
        base(exercise_minutes=30), base(exercise_minutes=29.95),
        base(water_ml=0), base(water_ml=None), base(water_ml=2250, water_target_ml=2500),
        base(steps=0), base(steps=None), base(steps=8000), base(steps=7999),
        base(calories=0), base(calories=None), base(calories=2500, calorie_target=2000),
        base(water_target_ml=None), base(calorie_target=None),
        base(activity_level="bogus", goal="bogus", gender="bogus"),
        base(activity_level=None, goal=None, gender=None),
    ]


def random_case(rng):
    def maybe(value, p=0.12):
        return None if rng.random() < p else value
    return base(
        bmi=round(rng.uniform(14, 45), rng.choice([1, 2, 3, 4])),
        age=rng.randint(13, 90),
        gender=rng.choice(GENDERS), activity_level=rng.choice(LEVELS), goal=rng.choice(GOALS),
        sleep_hours=maybe(round(rng.uniform(3, 11), rng.choice([1, 2, 3, 4]))),
        water_ml=maybe(rng.choice([rng.randint(0, 5000), round(rng.uniform(0, 5000), 2)])),
        water_target_ml=rng.choice([1500, 2000, 2500, 3000, 3500, 2750]),
        exercise_minutes=maybe(round(rng.uniform(0, 120), rng.choice([0, 1, 2, 3]))),
        steps=maybe(round(rng.uniform(0, 20000), rng.choice([0, 1, 2]))),
        calories=maybe(round(rng.uniform(800, 4000), rng.choice([0, 1, 2]))),
        calorie_target=rng.choice([1200, 1500, 1800, 2000, 2250, 2600, 3100]),
        stress_level=maybe(round(rng.uniform(0, 6), rng.choice([0, 1, 2, 3]))),
    )


def main():
    rng = random.Random(SEED)
    raws = edge_cases() + [random_case(rng) for _ in range(400)]
    cases = [{"id": i, "raw": raw, "expected": build_feature_row(raw)} for i, raw in enumerate(raws)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"seed": SEED, "cases": cases}, indent=1, sort_keys=True) + "\n")
    print(f"wrote {len(cases)} cases to {OUT}")


if __name__ == "__main__":
    main()
