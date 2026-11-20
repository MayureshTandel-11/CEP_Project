const User = jest.requireActual('../../src/models/User');

test('new users have both consents off; toPublic reports only effective consent', () => {
  const u = new User({ name: 'Ann Lee', email: 'a@b.co', passwordHash: 'x' });
  expect(u.toPublic()).toMatchObject({ external_ai_consent: false, medical_data_consent: false });
  u.medicalDataConsent = true;
  expect(u.toPublic().medical_data_consent).toBe(false); // external AI is still off
  u.externalAiConsent = true;
  expect(u.toPublic()).toMatchObject({ external_ai_consent: true, medical_data_consent: true });
});
