const { ACTIVITY_SCORES } = require('../utils/constants');

const GOAL_WEEKLY_MINUTES = {
  weight_loss: 220,
  weight_gain: 150,
  muscle_building: 180,
  maintain_weight: 150,
  improve_fitness: 210,
  improve_sleep: 150,
  general_wellness: 150,
};

const GOAL_PREFERRED_CATEGORIES = {
  weight_loss: ['cardio', 'walking', 'cycling', 'jogging'],
  weight_gain: ['strength training', 'mobility'],
  muscle_building: ['strength training', 'mobility'],
  maintain_weight: ['walking', 'cardio', 'yoga'],
  improve_fitness: ['cardio', 'jogging', 'cycling', 'strength training'],
  improve_sleep: ['yoga', 'stretching', 'walking'],
  general_wellness: ['walking', 'yoga', 'stretching', 'mobility'],
};

const MAX_DIFFICULTY_BY_LEVEL = {
  sedentary: 'easy',
  light: 'moderate',
  moderate: 'moderate',
  active: 'hard',
};
const DIFFICULTY_RANK = { easy: 1, moderate: 2, hard: 3 };

function allowedDifficulties(activityLevel) {
  const ceiling = DIFFICULTY_RANK[MAX_DIFFICULTY_BY_LEVEL[activityLevel] || 'moderate'];
  return Object.entries(DIFFICULTY_RANK).filter(([, rank]) => rank <= ceiling).map(([d]) => d);
}

function dailyMinutesTarget(profile) {
  const weekly = GOAL_WEEKLY_MINUTES[profile.goal] || 150;
  const scale = { 1: 0.6, 2: 0.8, 3: 1.0, 4: 1.15 }[ACTIVITY_SCORES[profile.activity_level]];
  return Math.round((weekly * scale) / 7);
}

function activityRules(metrics, profile) {
  const out = [];
  const level = profile.activity_level;
  if (level === 'sedentary') {
    out.push({
      code: 'ACT_SEDENTARY', area: 'activity', priority: 1,
      message: 'Start with short, easy sessions and a movement break every hour.',
      reason: 'Your recorded activity level is sedentary, so intensity is capped at easy for now.',
    });
  } else if (level === 'active') {
    out.push({
      code: 'ACT_HIGH', area: 'activity', priority: 3,
      message: 'You can handle harder sessions; keep at least one recovery day.',
      reason: 'Your recorded activity level is active.',
    });
  }

  if (profile.sitting_hours && profile.sitting_hours >= 8) {
    out.push({
      code: 'ACT_SITTING', area: 'activity', priority: 2,
      message: 'Stand and stretch for 3-5 minutes every hour.',
      reason: `You reported about ${profile.sitting_hours} sitting hours a day.`,
    });
  }

  if (['Overweight', 'Obese'].includes(metrics.bmi_category)) {
    out.push({
      code: 'ACT_LOW_IMPACT', area: 'activity', priority: 2,
      message: 'Low-impact options like walking, cycling and swimming are easier on the joints while still building endurance.',
      reason: `Low-impact work suits your current body status (${metrics.bmi_category}).`,
    });
  }
  return out;
}

module.exports = {
  GOAL_WEEKLY_MINUTES,
  GOAL_PREFERRED_CATEGORIES,
  MAX_DIFFICULTY_BY_LEVEL,
  DIFFICULTY_RANK,
  allowedDifficulties,
  dailyMinutesTarget,
  activityRules,
};
