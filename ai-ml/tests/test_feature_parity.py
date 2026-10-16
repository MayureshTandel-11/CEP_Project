"""Python side of the Python/JS feature-parity contract (see feature_golden.json)."""
import json
from pathlib import Path

import pytest

from app.features.engineering import build_feature_row, round_half_up

FIXTURE = Path(__file__).parent / "fixtures" / "feature_golden.json"


def _cases():
    return json.loads(FIXTURE.read_text())["cases"]


def test_fixture_is_large_enough():
    assert len(_cases()) >= 200


@pytest.mark.parametrize("case", _cases(), ids=lambda c: str(c["id"]))
def test_python_reproduces_fixture(case):
    assert build_feature_row(case["raw"]) == case["expected"]


def test_round_half_up_ties_go_up_not_to_even():
    assert round_half_up(0.8125, 3) == 0.813   # banker's rounding would give 0.812
    assert round_half_up(2.5, 0) == 3.0
    assert round_half_up(3.5, 0) == 4.0


def test_stress_is_rounded_and_clamped():
    assert build_feature_row({**_base(), "stress_level": 2.5})["stress_level"] == 3
    assert build_feature_row({**_base(), "stress_level": 4.49})["stress_level"] == 4
    assert build_feature_row({**_base(), "stress_level": 9})["stress_level"] == 5
    assert build_feature_row({**_base(), "stress_level": 0})["stress_level"] == 1
    assert build_feature_row({**_base(), "stress_level": None})["stress_level"] == 3


def test_missing_sleep_uses_target_not_zero():
    row = build_feature_row({**_base(), "sleep_hours": None})
    assert row["sleep_hours"] == 7.0 and row["sleep_adequacy"] == 1


def _base():
    return dict(bmi=22.0, age=30, gender="female", activity_level="moderate", goal="maintenance",
                sleep_hours=7.0, water_ml=2000, water_target_ml=2500, exercise_minutes=20,
                steps=6000, calories=2000, calorie_target=2000, stress_level=3)
