const { env } = require('../../src/config/env');
const { redactSecrets } = require('../../src/utils/redact');

describe('redactSecrets', () => {
  test.each([
    ['https://x/y?key=AIzaSyA1234567890abcdefghijkl&alt=json', 'AIzaSy'],
    ['Authorization: Bearer sk-abcdefghijklmnop1234', 'sk-abcdef'],
    ['{"x-goog-api-key":"SUPERSECRETVALUE123"}', 'SUPERSECRETVALUE123'],
    ['Bearer abcdefghijklmnopqrstuvwxyz0123', 'abcdefghijklmnop'],
    ['token sk-live_1234567890abcdef leaked', 'sk-live_1234567890abcdef'],
  ])('%p hides the secret', (text, secret) => {
    const out = redactSecrets(text);
    expect(out).not.toContain(secret);
    expect(out).toContain('[redacted]');
  });

  test('configured key values are removed wherever they appear', () => {
    const saved = env.openaiApiKey;
    env.openaiApiKey = 'configured-secret-value-42';
    expect(redactSecrets('failed for configured-secret-value-42 twice configured-secret-value-42'))
      .toBe('failed for [redacted] twice [redacted]');
    env.openaiApiKey = saved;
  });

  test('ordinary text and non-strings are untouched or safe', () => {
    expect(redactSecrets('HTTP 429 from gemini')).toBe('HTTP 429 from gemini');
    expect(redactSecrets(undefined)).toBe('');
  });
});
