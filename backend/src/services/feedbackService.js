const { Feedback, Recommendation, UserLog, UserProfile } = require('../models');
const { computeHealthMetrics } = require('./healthMetricsService');
const { summariseLogs } = require('./wellnessService');

const POSITIVE_RATING_THRESHOLD = 4;

async function analyseFeedback(userId) {
  const rows = await Feedback.find({ userId });
  if (!rows.length) {
    return { count: 0, average_rating: null, followed_rate: null, patterns: ['No feedback submitted yet.'] };
  }
  const ratings = rows.map((f) => f.rating);
  const followed = rows.filter((f) => f.followedPlan);
  const patterns = [];
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  if (avgRating < 3) {
    patterns.push('Recommendations are being rated low; consider reviewing your profile goal and preferences.');
  }
  if (followed.length / rows.length < 0.5) {
    patterns.push('Plans are often not followed - shorter sessions or simpler meals may fit your routine better.');
  }
  const weightChanges = rows.map((f) => f.weightChange).filter((v) => v !== null && v !== undefined);
  if (weightChanges.length) {
    const avg = weightChanges.reduce((a, b) => a + b, 0) / weightChanges.length;
    patterns.push(`Average reported weight change across feedback: ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} kg.`);
  }
  return {
    count: rows.length,
    average_rating: Math.round(avgRating * 100) / 100,
    followed_rate: Math.round((followed.length / rows.length) * 100) / 100,
    patterns: patterns.length ? patterns : ['No strong pattern detected yet.'],
  };
}

async function buildTrainingRowsFromFeedback() {
  const rows = [];
  const labels = [];
  const query = await Feedback.find({
    followedPlan: true,
    rating: { $gte: POSITIVE_RATING_THRESHOLD },
    recommendationId: { $ne: null },
  });
  for (const feedback of query) {
    const rec = await Recommendation.findById(feedback.recommendationId);
    if (!rec || !rec.mlPrediction) continue;
    const profileDoc = await UserProfile.findOne({ userId: rec.userId });
    if (!profileDoc) continue;
    const profile = profileDoc.asEngine();
    const metrics = computeHealthMetrics(profile);
    const logs = await UserLog.find({ userId: rec.userId });
    const summary = summariseLogs(logs);
    rows.push({
      bmi: metrics.bmi,
      age: profile.age,
      gender: profile.gender,
      weight_kg: profile.weight_kg,
      activity_level: profile.activity_level,
      goal: profile.goal,
      sleep_hours: summary.avg_sleep || profile.sleep_hours,
      water_ml: summary.avg_water,
      water_target_ml: metrics.water_target_ml,
      exercise_minutes: summary.avg_exercise_minutes,
      steps: summary.avg_steps,
      calories: summary.avg_calories,
      calorie_target: metrics.calorie_target,
      stress_level: profile.stress_level,
    });
    labels.push(rec.mlPrediction);
  }
  return { rows, labels };
}

module.exports = {
  POSITIVE_RATING_THRESHOLD,
  analyseFeedback,
  buildTrainingRowsFromFeedback,
};
