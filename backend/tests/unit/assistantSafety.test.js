const { env } = require('../../src/config/env');
const { ask, FILTERED_REPLY_MESSAGE } = require('../../src/services/aiService');

const reply = (content) => ({ json: async () => ({ choices: [{ message: { content } }] }) });
const veganPeanutProfile = {
  food_preference: 'vegan', allergy_list: ['peanut'], dislike_list: [],
};

const saved = {};
beforeEach(() => {
  saved.key = env.openaiApiKey;
  saved.provider = env.aiProvider;
  saved.gemini = env.geminiApiKey;
  saved.llama = env.llamaApiUrl;
  env.openaiApiKey = 'test-key';
  env.aiProvider = 'openai';
  env.geminiApiKey = '';
  env.llamaApiUrl = '';
  global.fetch = jest.fn();
});
afterEach(() => {
  env.openaiApiKey = saved.key;
  env.aiProvider = saved.provider;
  env.geminiApiKey = saved.gemini;
  env.llamaApiUrl = saved.llama;
  delete global.fetch;
});

describe('assistant free-text replies', () => {
  test('a reply that violates the profile is replaced by a safe message', async () => {
    global.fetch.mockResolvedValue(reply('Try a peanut butter and chicken wrap.'));
    const out = await ask('Give me a lunch idea', 'context', veganPeanutProfile);
    expect(out.reply).toBe(FILTERED_REPLY_MESSAGE);
    expect(out.filtered).toBe(true);
    expect(out.available).toBe(true);
  });

  test('a compliant reply is returned unchanged', async () => {
    global.fetch.mockResolvedValue(reply('Try a lentil and spinach soup with brown rice.'));
    const out = await ask('Give me a lunch idea', 'context', veganPeanutProfile);
    expect(out.reply).toBe('Try a lentil and spinach soup with brown rice.');
    expect(out.filtered).toBeUndefined();
  });

  test('without a profile the reply is withheld (fail closed)', async () => {
    global.fetch.mockResolvedValue(reply('Try a lentil soup.'));
    const out = await ask('Give me a lunch idea', 'context', undefined);
    expect(out.reply).toBe(FILTERED_REPLY_MESSAGE);
  });

  test('medical-claim replies are withheld', async () => {
    global.fetch.mockResolvedValue(reply('You should stop taking your medication and eat more fibre.'));
    const out = await ask('Advice?', 'context', { food_preference: 'non-vegetarian' });
    expect(out.reply).toBe(FILTERED_REPLY_MESSAGE);
  });

  test('not configured: unchanged behaviour', async () => {
    env.openaiApiKey = '';
    const out = await ask('hello', 'context', veganPeanutProfile);
    expect(out.available).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
