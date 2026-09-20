const { env } = require('../config/env');

const NOT_CONFIGURED_MESSAGE = (
  'The optional AI assistant is not configured. Core nutrition, activity, and '
  + 'wellness recommendations are still available.'
);

const SYSTEM_PROMPT = (
  'You are a general wellness assistant inside a student project. '
  + 'Give short, practical, non-clinical suggestions about nutrition, movement, '
  + 'sleep and hydration. You must not diagnose conditions, interpret symptoms, '
  + 'suggest medication, or give treatment advice. If a question is medical, say '
  + 'it is outside your scope and suggest speaking to a qualified professional. '
  + 'Never recommend foods that conflict with stated allergies or diet. Never change calorie maths.'
);

async function timedFetch(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function openaiComplete(apiKey, prompt, model = 'gpt-4o-mini') {
  const res = await timedFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function geminiComplete(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }] }),
  });
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

async function llamaComplete(apiUrl, apiKey, prompt) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await timedFetch(`${apiUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'llama',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function getProvider() {
  const name = env.aiProvider || 'openai';
  if (name === 'gemini' && env.geminiApiKey) return { name: 'gemini', complete: (p) => geminiComplete(env.geminiApiKey, p) };
  if (name === 'llama' && env.llamaApiUrl) return { name: 'llama', complete: (p) => llamaComplete(env.llamaApiUrl, env.llamaApiKey, p) };
  if (env.openaiApiKey) return { name: 'openai', complete: (p) => openaiComplete(env.openaiApiKey, p) };
  if (env.geminiApiKey) return { name: 'gemini', complete: (p) => geminiComplete(env.geminiApiKey, p) };
  if (env.llamaApiUrl) return { name: 'llama', complete: (p) => llamaComplete(env.llamaApiUrl, env.llamaApiKey, p) };
  return null;
}

function buildContext(profile, metrics, summary) {
  return (
    `User context - goal: ${profile.goal}, activity level: ${profile.activity_level}, `
    + `food preference: ${profile.food_preference}, `
    + `allergies: ${(profile.allergy_list || []).join(', ') || 'none'}. `
    + `BMI ${metrics.bmi} (${metrics.bmi_category}), daily calorie target `
    + `${metrics.calorie_target} kcal, water target ${metrics.water_target_ml} ml. `
    + `Recent logs - avg sleep ${summary.avg_sleep}, avg water `
    + `${summary.avg_water}, avg steps ${summary.avg_steps}.`
  );
}

async function ask(message, context) {
  const provider = getProvider();
  if (!provider) {
    return { available: false, reply: NOT_CONFIGURED_MESSAGE, provider: null };
  }
  try {
    const reply = await provider.complete(`${context}\n\nUser question: ${message}`);
    return { available: true, reply, provider: provider.name };
  } catch {
    return {
      available: false,
      reply: 'The AI assistant could not be reached right now. Your nutrition, activity and wellness recommendations are unaffected.',
      provider: provider.name,
    };
  }
}

async function enhanceWording(text) {
  const provider = getProvider();
  if (!provider || !text) return text;
  try {
    const reply = await provider.complete(
      `Rewrite this wellness explanation in one short friendly sentence. `
      + `Do not add new foods, activities, numbers, or medical claims.\n\n${text}`,
    );
    return reply || text;
  } catch {
    return text;
  }
}

module.exports = {
  NOT_CONFIGURED_MESSAGE,
  getProvider,
  buildContext,
  ask,
  enhanceWording,
};
