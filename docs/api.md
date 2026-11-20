# API

Base URL: `http://localhost:5000/api`

Auth: HTTP-only session cookie. Send `credentials: include` from the frontend.

Success:

```json
{ "success": true, "message": "OK", "data": {} }
```

Error:

```json
{ "success": false, "message": "Unable to process the request.", "error": "VALIDATION_ERROR" }
```

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| POST | `/auth/register` | no |
| POST | `/auth/login` | no |
| POST | `/auth/logout` | no |
| GET | `/auth/me` | yes |
| GET/PUT | `/profile` | yes |
| GET | `/profile/options` | no |
| GET | `/health-metrics` | yes |
| GET | `/recommendations/nutrition` | yes |
| GET | `/recommendations/activity` | yes |
| GET | `/recommendations/activity/weekly` | yes |
| GET | `/recommendations/wellness` | yes |
| GET | `/recommendations/recent` | yes |
| GET | `/foods` | yes |
| GET | `/activities` | yes |
| POST/GET | `/logs` | yes |
| PUT/DELETE | `/logs/:id` | yes |
| GET | `/dashboard?range=7\|30\|90` | yes |
| GET | `/wellness-score` | yes |
| POST/GET | `/feedback` | yes |
| GET | `/ml/explanation` | yes |
| POST | `/ml/retrain` | yes, admin only (`ADMIN_EMAILS`); one run at a time (409 otherwise) |
| GET | `/assistant/status` | yes |
| POST | `/assistant` | yes |

Registration requires name, email, password (≥8 characters, letter + number).
Login failures always return `Incorrect email or password.`

## AI consent, time zone and safe-match behaviour

- `PUT /api/auth/ai-consent` with `{"external_ai"?: bool, "medical_data"?: bool}`. Both are **off by default**.
  `medical_data` needs `external_ai`; turning `external_ai` off turns both off.
- With no external-AI consent nothing is sent to an AI provider (no request is made) and responses carry
  `ai_status: "not_consented"`. Other values: `not_configured`, `ok`, `unavailable`.
- A provider prompt is built only from an allowlist (`services/consentService.js`): age band, goal, activity level,
  food preference, allergies, dislikes, BMI category, calorie/protein/water targets and 7-day averages.
  Diagnosed condition **categories** are added only with both consents. Free text, medications, exact age, gender,
  the BMI value, budget, stress, sitting hours and meal frequency are never sent.
- Provider keys are never placed in URLs (Gemini uses the `x-goog-api-key` header), non-2xx replies are errors, and
  logged error text is redacted.
- `timezone` on the profile is an IANA name (`Asia/Kolkata`, `UTC`). It is UTC until the user sets one and is never
  inferred; it decides what "today" is for logs, the dashboard and stored recommendations.
- Nutrition plans carry `status`: `ok`, `partial` or `no_safe_match`, per-meal `status` and `meal_type_fallback`, and
  `exclusion_reasons`. With no safe food the plan is empty with a message; nothing is substituted and no AI text is
  requested for it. Dislikes and allergen terms match whole words only (`utils/termMatch.js`).

## Research consent and outcome capture

`PUT /api/auth/research-consent` (signed in) with `{"consent": true|false}` records or withdraws
opt-in to model evaluation. Default is off. Only consenting users are ever eligible for the
optional ML holdout (`ML_CONTROL_FRACTION`, default 0 = disabled) or the data export.

Each stored activity recommendation records `featureSnapshot`, `plannedDailyMinutes`,
`modelVersion`, `adjustmentApplied`, `controlGroup` and whether the user had consented.
Export for the adherence pipeline: `node backend/scripts/exportAdherenceData.js --out DIR`
(consenting users only; integer pseudonymous ids, per-user day indices, no dates/emails).
