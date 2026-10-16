const { env } = require('../../src/config/env');
const { predictCategory, retrain, getModelMetadata } = require('../../src/services/mlService');

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

let saved;
beforeEach(() => {
  saved = { token: env.mlInternalToken, enabled: env.mlEnabled };
  env.mlEnabled = true;
  global.fetch = jest.fn().mockResolvedValue(okResponse({ available: false, reason: 'stub' }));
});
afterEach(() => {
  env.mlInternalToken = saved.token;
  env.mlEnabled = saved.enabled;
  delete global.fetch;
});

const sentHeaders = () => global.fetch.mock.calls[0][1].headers || {};

describe('X-Internal-Token on calls to the ML service', () => {
  test('sent on /predict when configured', async () => {
    env.mlInternalToken = 'secret-123';
    await predictCategory({ bmi: 22 });
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/predict$/);
    expect(sentHeaders()['X-Internal-Token']).toBe('secret-123');
    expect(sentHeaders()['Content-Type']).toBe('application/json');
  });

  test('sent on /retrain and on GET /model/metadata', async () => {
    env.mlInternalToken = 'secret-123';
    await retrain([], [], { force: false });
    expect(sentHeaders()['X-Internal-Token']).toBe('secret-123');

    global.fetch.mockClear();
    await getModelMetadata();
    expect(global.fetch.mock.calls[0][1].headers['X-Internal-Token']).toBe('secret-123');
  });

  test('not sent when no token is configured', async () => {
    env.mlInternalToken = '';
    await predictCategory({ bmi: 22 });
    expect(sentHeaders()['X-Internal-Token']).toBeUndefined();
  });

  test('a 401/403 from the ML service degrades to rules_only instead of throwing', async () => {
    env.mlInternalToken = 'wrong';
    global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: 'Invalid internal token.' }) });
    const result = await predictCategory({ bmi: 22 });
    expect(result.available).toBe(false);
  });
});
