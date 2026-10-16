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

## Research consent and outcome capture

`PUT /api/auth/research-consent` (signed in) with `{"consent": true|false}` records or withdraws
opt-in to model evaluation. Default is off. Only consenting users are ever eligible for the
optional ML holdout (`ML_CONTROL_FRACTION`, default 0 = disabled) or the data export.

Each stored activity recommendation records `featureSnapshot`, `plannedDailyMinutes`,
`modelVersion`, `adjustmentApplied`, `controlGroup` and whether the user had consented.
Export for the adherence pipeline: `node backend/scripts/exportAdherenceData.js --out DIR`
(consenting users only; integer pseudonymous ids, per-user day indices, no dates/emails).
