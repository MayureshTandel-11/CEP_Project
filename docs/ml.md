# Machine learning

The classifier lives only in `ai-ml/`. It is a `RandomForestClassifier` trained
on a **synthetic student/demo dataset**. It is not medically accurate.

## Features (14)

bmi, age, activity_score, sleep_hours, sleep_adequacy, hydration_ratio,
hydration_adequacy, exercise_minutes, exercise_adequacy, steps_ratio,
calorie_ratio, stress_level, goal_code, gender_code.

Express sends a clean feature object. Imputation of missing log values happens
in both Express (`featureBuilder.js`) and Python (`preprocessing/pipeline.py`)
with the same defaults.

## Labels

weight_management, fitness_improvement, hydration_focus, sleep_focus,
activity_focus, balanced_wellness.

Heuristic plus 7% label noise. Documented in `ai-ml/app/training/dataset.py`.

## Endpoints (port 8000)

| Method | Path |
|---|---|
| GET | `/health` |
| POST | `/predict` |
| GET | `/model/explanation` |
| GET | `/model/metadata` |
| POST | `/train` |
| POST | `/retrain` |
| POST | `/evaluate` |

Prediction never raises to Express. Unavailable models return `{ available: false }`.

## Retraining

Positive feedback (followed plan + rating ≥ 4 + stored ML label) is turned into
extra rows. A new model is promoted only if accuracy ≥ 0.80 **and** ≥ current,
unless `force` is set. Each run is stored in `mlTrainingRuns`.

## Train locally

```bash
cd ai-ml
python -m app.training.train
```
