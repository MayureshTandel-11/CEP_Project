#!/usr/bin/env node
/**
 * Export consented users' data in the adherence-pipeline schema (CSV, per-user day indices,
 * no calendar dates, no names/emails). Usage:
 *   node scripts/exportAdherenceData.js --out ./adherence_export
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { User, UserProfile, UserLog, Recommendation } = require('../src/models');
const { computeHealthMetrics } = require('../src/services/healthMetricsService');
const { buildAdherenceExport, toCsv } = require('../src/services/adherenceExport');

async function main() {
  const outIdx = process.argv.indexOf('--out');
  if (outIdx < 0 || !process.argv[outIdx + 1]) throw new Error('Usage: --out <directory>');
  const out = path.resolve(process.argv[outIdx + 1]);

  await mongoose.connect(env.mongoUri);
  const consenting = await User.find({ researchConsent: true }).select('_id researchConsent');
  const ids = consenting.map((u) => u._id);
  const profiles = await UserProfile.find({ userId: { $in: ids } });
  const users = profiles.map((p) => {
    const e = p.asEngine();
    return {
      id: p.userId, consent: true, age: e.age, gender: e.gender,
      bmi: computeHealthMetrics(e).bmi, activity_level: e.activity_level, goal: e.goal,
    };
  });
  const logs = (await UserLog.find({ userId: { $in: ids } })).map((l) => ({
    userId: l.userId, date: l.logDate, sleep: l.sleep, water: l.water, steps: l.steps,
    exercise_minutes: l.exerciseMinutes, stress: l.stress,
  }));
  const recs = (await Recommendation.find({ userId: { $in: ids }, recType: 'activity' })).map((r) => ({
    userId: r.userId, recDate: r.recDate, recType: r.recType,
    plannedDailyMinutes: r.plannedDailyMinutes, researchConsent: r.researchConsent,
    controlGroup: r.controlGroup, adjustmentApplied: r.adjustmentApplied, modelVersion: r.modelVersion,
  }));

  const data = buildAdherenceExport({ users, logs, recs });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, rows] of Object.entries(data)) fs.writeFileSync(path.join(out, `${name}.csv`), toCsv(rows));
  fs.writeFileSync(path.join(out, 'DATA_ORIGIN.txt'), 'real\nExported from the app database for consenting users.\n');
  console.log(`Exported ${data.users.length} users, ${data.snapshots.length} snapshots to ${out}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
