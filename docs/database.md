# Database

MongoDB database: `wellness_db` (`mongodb://127.0.0.1:27017/wellness_db`).

Sessions are stored in the `sessions` collection via connect-mongo.

## Collection mapping (old SQL → MongoDB)

| Old MySQL table | MongoDB collection | Mongoose model |
|---|---|---|
| users | users | User |
| user_profiles | userprofiles | UserProfile |
| user_logs | userlogs | UserLog |
| food | foods | Food |
| activity | activities | Activity |
| recommendations | recommendations | Recommendation |
| feedback | feedback | Feedback |
| ml_training_runs | mltrainingruns | MLTrainingRun |

## Indexes

- User: unique `email`
- UserProfile: unique `userId`
- UserLog: unique `{ userId, logDate }`
- Recommendation: `{ userId, recDate }`
- Feedback: `userId`
- Food: `category`, `mealType`, `foodName`
- Activity: `category`, `difficulty`, `activityName`

Every user-owned query is scoped to `req.session.userId`.
