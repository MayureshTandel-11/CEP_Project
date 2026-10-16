/**
 * Pure transformation from app records to the adherence-pipeline schema
 * (docs/ml_adherence_design.md). Only users who consented, and recommendations recorded
 * while they had consented, are exported. No database access here.
 */
const crypto = require('crypto');

const DAY_MS = 86400000;
const MIN_SNAPSHOT_SPACING_DAYS = 7;

const dayNumber = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

/**
 * @param {{users: Array, logs: Array, recs: Array}} input
 *   users: {id, consent, age, gender, bmi, activity_level, goal}
 *   logs:  {userId, date, sleep, water, steps, exercise_minutes, stress}
 *   recs:  {userId, recDate, recType, plannedDailyMinutes, researchConsent,
 *           controlGroup, adjustmentApplied, modelVersion}
 */
function buildAdherenceExport({ users, logs, recs }) {
  const consenting = new Map(users.filter((u) => u.consent).map((u) => [String(u.id), u]));
  const out = { users: [], daily_logs: [], snapshots: [] };

  const logsBy = new Map();
  for (const l of logs) {
    const key = String(l.userId);
    if (consenting.has(key)) (logsBy.get(key) || logsBy.set(key, []).get(key)).push(l);
  }
  const recsBy = new Map();
  for (const r of recs) {
    const key = String(r.userId);
    if (consenting.has(key) && r.researchConsent && r.recType === 'activity'
      && Number.isFinite(r.plannedDailyMinutes)) {
      (recsBy.get(key) || recsBy.set(key, []).get(key)).push(r);
    }
  }

  // Pseudonymous integer ids (the Python pipeline needs ints). Ordered by a hash so the id
  // reveals neither the Mongo ObjectId nor sign-up order. The mapping is not exported.
  const order = [...consenting.keys()].sort((x, y) => {
    const h = (v) => crypto.createHash('sha256').update(`export:${v}`).digest('hex');
    return h(x).localeCompare(h(y));
  });
  const pseudo = new Map(order.map((k, i) => [k, i]));

  for (const key of order) {
    const u = consenting.get(key);
    const uid = pseudo.get(key);
    const userLogs = logsBy.get(key) || [];
    const userRecs = (recsBy.get(key) || []).sort((a, b) => a.recDate.localeCompare(b.recDate));
    if (!userRecs.length) continue;
    const dates = [...userLogs.map((l) => l.date), ...userRecs.map((r) => r.recDate)];
    const origin = Math.min(...dates.map(dayNumber)); // per-user day 0; no calendar dates leave
    out.users.push({
      user_id: uid, age: u.age, gender: u.gender, bmi: u.bmi,
      activity_level: u.activity_level, goal: u.goal, data_origin: 'real',
    });
    for (const l of userLogs) {
      out.daily_logs.push({
        user_id: uid, day: dayNumber(l.date) - origin,
        sleep_hours: l.sleep ?? '', water_ml: l.water ?? '', steps: l.steps ?? '',
        exercise_minutes: l.exercise_minutes ?? '', stress_level: l.stress ?? '',
        data_origin: 'real',
      });
    }
    let last = -Infinity;
    for (const r of userRecs) {
      const T = dayNumber(r.recDate) - origin;
      if (T - last < MIN_SNAPSHOT_SPACING_DAYS) continue; // one plan per weekly window
      last = T;
      out.snapshots.push({
        user_id: uid, T, planned_daily_minutes: r.plannedDailyMinutes,
        control_group: Boolean(r.controlGroup), adjustment_applied: Boolean(r.adjustmentApplied),
        model_version: r.modelVersion ?? '', data_origin: 'real',
      });
    }
  }
  return out;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${[cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')}\n`;
}

module.exports = { buildAdherenceExport, toCsv, MIN_SNAPSHOT_SPACING_DAYS };
