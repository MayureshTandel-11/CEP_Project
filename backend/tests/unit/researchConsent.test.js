jest.mock('../../src/models', () => ({ User: { findById: jest.fn() }, UserProfile: {} }));
jest.mock('../../src/services/authService', () => ({}));
const { User } = require('../../src/models');
const { setResearchConsent } = require('../../src/controllers/authController');

function run(body) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ res: this, body: b }); return this; } };
    setResearchConsent({ body, session: { userId: 'u1' } }, res, (err) => resolve({ err }));
  });
}

test('records consent with a timestamp', async () => {
  const user = { researchConsent: false, researchConsentAt: null, save: jest.fn(async () => {}) };
  User.findById.mockResolvedValue(user);
  const { err } = await run({ consent: true });
  expect(err).toBeUndefined();
  expect(user.researchConsent).toBe(true);
  expect(user.researchConsentAt).toBeInstanceOf(Date);
  expect(user.save).toHaveBeenCalled();
});

test('withdrawal clears the timestamp', async () => {
  const user = { researchConsent: true, researchConsentAt: new Date(), save: jest.fn(async () => {}) };
  User.findById.mockResolvedValue(user);
  await run({ consent: false });
  expect(user.researchConsent).toBe(false);
  expect(user.researchConsentAt).toBeNull();
});

test.each([{}, { consent: 'yes' }, { consent: 1 }])('non-boolean %j is rejected, nothing saved', async (body) => {
  const user = { save: jest.fn() };
  User.findById.mockResolvedValue(user);
  const { err } = await run(body);
  expect(err).toBeDefined();
  expect(err.statusCode).toBe(422);
  expect(user.save).not.toHaveBeenCalled();
});
