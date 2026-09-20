# Viva notes

## One-sentence pitch

A MERN wellness app that recommends meals, activity and daily habits using
hard safety rules first, then a Random Forest focus category, then transparent
content scoring.

## What to emphasise

- **Safety > ML.** Peanut allergy, vegan preference and beginner difficulty
  cannot be overridden by the model or by optional AI.
- **Graceful degradation.** Unplug FastAPI and the plans still generate.
- **Explainability.** Every food/activity has a reason; the ML page shows
  importances, probabilities and a confusion matrix.
- **Health maths.** BMI, Mifflin-St Jeor BMR, TDEE, goal-adjusted calories,
  macros, water — all unit-tested from `constants.js`.
- **Not a medical device.** Disclaimer on dashboard and plans.

## Typical questions

**Why MongoDB?** Flexible documents for recommendation snapshots and feedback;
sessions via connect-mongo.

**Why not put sklearn in Express?** The viva-friendly split keeps APIs in Node
and scientific tooling in Python.

**Why Random Forest?** Stable on noisy synthetic labels and exposes feature
importances for the explanation page.

**How does retraining avoid a bad model?** Accuracy gate vs the current model;
runs are audited even when not promoted.
