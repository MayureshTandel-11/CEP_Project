const { buildAdherenceExport, toCsv } = require('../../src/services/adherenceExport');

const user = (id, consent = true) => ({ id, consent, age: 30, gender: 'female', bmi: 22, activity_level: 'light', goal: 'general_wellness' });
const rec = (userId, recDate, extra = {}) => ({
  userId, recDate, recType: 'activity', plannedDailyMinutes: 30, researchConsent: true,
  controlGroup: false, adjustmentApplied: true, modelVersion: 'RF', ...extra,
});
const log = (userId, date, extra = {}) => ({ userId, date, sleep: 7, water: 2000, steps: 5000, exercise_minutes: 20, stress: 3, ...extra });

test('only consenting users and consented recommendations are exported', () => {
  const out = buildAdherenceExport({
    users: [user('a'), user('b', false)],
    logs: [log('a', '2026-03-01'), log('b', '2026-03-01')],
    recs: [rec('a', '2026-03-02'), rec('b', '2026-03-02'), rec('a', '2026-03-20', { researchConsent: false })],
  });
  expect(out.users).toHaveLength(1);
  expect(Number.isInteger(out.users[0].user_id)).toBe(true);
  expect(out.daily_logs.every((l) => l.user_id === out.users[0].user_id)).toBe(true);
  expect(out.snapshots).toHaveLength(1);
});

test('days are per-user indices from that user\'s first record; no calendar dates leak', () => {
  const out = buildAdherenceExport({
    users: [user('a')],
    logs: [log('a', '2026-03-01'), log('a', '2026-03-04')],
    recs: [rec('a', '2026-03-02')],
  });
  expect(out.daily_logs.map((l) => l.day)).toEqual([0, 3]);
  expect(out.snapshots[0].T).toBe(1);
  expect(JSON.stringify(out)).not.toMatch(/2026-/);
});

test('snapshots are at least 7 days apart', () => {
  const recs = ['2026-03-01', '2026-03-03', '2026-03-08', '2026-03-10', '2026-03-15'].map((d) => rec('a', d));
  const out = buildAdherenceExport({ users: [user('a')], logs: [], recs });
  expect(out.snapshots.map((s) => s.T)).toEqual([0, 7, 14]);
});

test('recommendations without a planned-minutes value, and non-activity ones, are skipped', () => {
  const out = buildAdherenceExport({
    users: [user('a')], logs: [],
    recs: [rec('a', '2026-03-01', { plannedDailyMinutes: null }), rec('a', '2026-03-09', { recType: 'nutrition' })],
  });
  expect(out.users).toEqual([]);
});

test('missing log values become empty cells; arm and model version are kept', () => {
  const out = buildAdherenceExport({
    users: [user('a')], logs: [log('a', '2026-03-01', { water: null })],
    recs: [rec('a', '2026-03-01', { controlGroup: true, adjustmentApplied: false, modelVersion: null })],
  });
  expect(out.daily_logs[0].water_ml).toBe('');
  expect(out.snapshots[0]).toMatchObject({ control_group: true, adjustment_applied: false, model_version: '' });
  expect(out.users[0].data_origin).toBe('real');
});

test('exported ids are integers, unique, and do not contain the original ids', () => {
  const out = buildAdherenceExport({
    users: [user('64f0aa11'), user('64f0bb22')], logs: [],
    recs: [rec('64f0aa11', '2026-03-01'), rec('64f0bb22', '2026-03-01')],
  });
  expect(out.users.map((u) => u.user_id).sort()).toEqual([0, 1]);
  expect(JSON.stringify(out)).not.toMatch(/64f0/);
});

test('toCsv escapes and handles empty input', () => {
  expect(toCsv([])).toBe('');
  expect(toCsv([{ a: 'x,y', b: 'he said "hi"' }])).toBe('a,b\n"x,y","he said ""hi"""\n');
});
