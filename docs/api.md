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
| POST | `/ml/retrain` | yes |
| GET | `/assistant/status` | yes |
| POST | `/assistant` | yes |

Registration requires name, email, password (≥8 characters, letter + number).
Login failures always return `Incorrect email or password.`
