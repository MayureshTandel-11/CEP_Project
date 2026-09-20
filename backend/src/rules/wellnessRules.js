const {
  EXERCISE_MINUTES_TARGET, MOOD_LOW_THRESHOLD, SLEEP_LOW_HOURS,
  SLEEP_TARGET_HOURS, STEPS_TARGET, STRESS_HIGH_THRESHOLD,
} = require('../utils/constants');

function avg(values) {
  const nums = values.filter((v) => v !== null && v !== undefined);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function logField(log, camel, snake) {
  if (log[camel] !== undefined) return log[camel];
  if (log[snake] !== undefined) return log[snake];
  return log.toPublic ? log.toPublic()[snake] : undefined;
}

function wellnessRules(logs, metrics, _profile) {
  const out = [];
  if (!logs || !logs.length) {
    return [{
      code: 'NO_LOGS', area: 'wellness', priority: 1,
      message: 'Log your sleep, water and steps for a few days to unlock personalised wellness tips.',
      reason: 'You have not recorded any wellness logs yet.',
    }];
  }

  const avgSleep = avg(logs.map((l) => logField(l, 'sleep', 'sleep')));
  const avgWater = avg(logs.map((l) => logField(l, 'water', 'water')));
  const avgSteps = avg(logs.map((l) => logField(l, 'steps', 'steps')));
  const avgExercise = avg(logs.map((l) => logField(l, 'exerciseMinutes', 'exercise_minutes')));
  const avgStress = avg(logs.map((l) => logField(l, 'stress', 'stress')));
  const avgMood = avg(logs.map((l) => logField(l, 'mood', 'mood')));
  const waterTarget = metrics.water_target_ml;

  if (avgSleep !== null && avgSleep < SLEEP_LOW_HOURS) {
    out.push({
      code: 'SLEEP_LOW', area: 'wellness', priority: 1,
      message: 'Try a consistent bedtime and put screens away 30 minutes before sleep. Aim to add 30 minutes at a time.',
      reason: `Your logged sleep averages ${avgSleep.toFixed(1)} h, below the ${SLEEP_TARGET_HOURS} h general guideline.`,
    });
  } else if (avgSleep !== null && avgSleep < SLEEP_TARGET_HOURS) {
    out.push({
      code: 'SLEEP_SLIGHTLY_LOW', area: 'wellness', priority: 2,
      message: 'You are close to the usual sleep range; a slightly earlier bedtime would close the gap.',
      reason: `Your logged sleep averages ${avgSleep.toFixed(1)} h.`,
    });
  }

  if (avgWater !== null && avgWater < waterTarget) {
    out.push({
      code: 'HYDRATION_LOW', area: 'wellness', priority: 1,
      message: `Keep a bottle at your desk and aim for about ${waterTarget} ml across the day.`,
      reason: `Your logged water intake averages ${avgWater.toFixed(0)} ml against a ${waterTarget} ml target.`,
    });
  }

  if (avgSteps !== null && avgSteps < STEPS_TARGET) {
    out.push({
      code: 'STEPS_LOW', area: 'wellness', priority: 2,
      message: 'Add a 10-minute walk after each meal to lift your daily step count.',
      reason: `Your logged steps average ${avgSteps.toFixed(0)} against a ${STEPS_TARGET} step target.`,
    });
  }

  if (avgExercise !== null && avgExercise < EXERCISE_MINUTES_TARGET) {
    out.push({
      code: 'EXERCISE_LOW', area: 'wellness', priority: 2,
      message: 'Two or three short sessions a day count just as much as one long one. Start with 10 minutes.',
      reason: `Your logged exercise averages ${avgExercise.toFixed(0)} min/day against a ${EXERCISE_MINUTES_TARGET} min target.`,
    });
  }

  if (avgStress !== null && avgStress >= STRESS_HIGH_THRESHOLD) {
    out.push({
      code: 'STRESS_HIGH', area: 'wellness', priority: 1,
      message: 'Try a few minutes of slow breathing (4 seconds in, 6 seconds out) or a short walk outdoors. If stress keeps affecting your daily life, talking to a professional is a good step.',
      reason: `Your logged stress averages ${avgStress.toFixed(1)} on a 1-5 scale.`,
    });
  }

  if (avgMood !== null && avgMood <= MOOD_LOW_THRESHOLD) {
    out.push({
      code: 'MOOD_LOW', area: 'wellness', priority: 1,
      message: 'Small routines help: daylight in the morning, some movement, and staying in touch with people you like. Reach out to someone you trust if this continues.',
      reason: `Your logged mood averages ${avgMood.toFixed(1)} on a 1-5 scale.`,
    });
  }

  if (!out.length) {
    out.push({
      code: 'ALL_ON_TRACK', area: 'wellness', priority: 3,
      message: 'Your sleep, hydration and activity logs all look consistent. Keep the routine going.',
      reason: 'Your recent logs meet every configured wellness threshold.',
    });
  }
  return out;
}

module.exports = { wellnessRules };
