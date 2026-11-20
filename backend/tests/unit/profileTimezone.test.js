/** The profile stores a time zone only when the user sends one; it is never inferred. */
const mockUpdate = jest.fn(async (_q, update) => ({ ...update.$set }));
jest.mock('../../src/models', () => ({
  UserProfile: { findOneAndUpdate: (...a) => mockUpdate(...a), findOne: jest.fn() },
}));

const { UserProfile } = require('../../src/models');
const { upsertProfile, getUserTimeZone } = require('../../src/services/profileService');

const BASE = {
  age: 30, gender: 'female', height_cm: 165, weight_kg: 60, activity_level: 'light',
  food_preference: 'vegan', sleep_hours: 7, goal: 'maintain_weight',
};
const savedSet = () => mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][1].$set;

beforeEach(() => { mockUpdate.mockClear(); UserProfile.findOne.mockReset(); });

test('saving without a timezone does not write one (UTC default / existing value is kept)', async () => {
  await upsertProfile('u1', BASE);
  expect('timezone' in savedSet()).toBe(false);
});

test.each([undefined, null, ''])('timezone %p is treated as not sent', async (tz) => {
  await upsertProfile('u1', { ...BASE, timezone: tz });
  expect('timezone' in savedSet()).toBe(false);
});

test('an explicit valid zone is stored', async () => {
  await upsertProfile('u1', { ...BASE, timezone: 'Asia/Kolkata' });
  expect(savedSet().timezone).toBe('Asia/Kolkata');
});

test.each(['Mars/Olympus', '+05:30', 'IST'])('an invalid zone %p is rejected and nothing is saved', async (tz) => {
  await expect(upsertProfile('u1', { ...BASE, timezone: tz })).rejects.toThrow(/IANA/);
  expect(mockUpdate).not.toHaveBeenCalled();
});

test('getUserTimeZone: no profile or bad stored value is UTC', async () => {
  UserProfile.findOne.mockResolvedValueOnce(null);
  expect(await getUserTimeZone('u1')).toBe('UTC');
  UserProfile.findOne.mockResolvedValueOnce({ timezone: 'Nowhere/Land' });
  expect(await getUserTimeZone('u1')).toBe('UTC');
  UserProfile.findOne.mockResolvedValueOnce({});
  expect(await getUserTimeZone('u1')).toBe('UTC');
  UserProfile.findOne.mockResolvedValueOnce({ timezone: 'Europe/London' });
  expect(await getUserTimeZone('u1')).toBe('Europe/London');
});
