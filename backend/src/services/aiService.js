const { env } = require('../config/env');
const { buildConstraints, filterLlmRecommendations, isTextSafe } = require('./llmSafety');
const { NO_CONSENT, buildProviderProfile } = require('./consentService');
const { redactSecrets } = require('../utils/redact');

/** A provider answered with a non-2xx status. The message never includes the response body. */
class ProviderHttpError extends Error {
  constructor(provider, status) {
    super(`${provider} request failed with HTTP ${status}`);
    this.name = 'ProviderHttpError';
    this.provider = provider;
    this.status = status;
  }
}

const CONSENT_REQUIRED_MESSAGE = (
  'AI features are off. Turn on "Use an external AI provider" in your profile to use the assistant. '
  + 'Your nutrition, activity and wellness recommendations work without it.'
);

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

/**
 * System prompt for structured recommendation generation.
 * Enforces medical safety constraints and structured JSON output.
 */
const RECOMMENDATION_SYSTEM_PROMPT = (
  'You are a wellness recommendation assistant inside a personal wellness application. '
  + 'Your job is to provide personalized nutrition, physical activity, and general wellness recommendations '
  + 'using the user\'s provided profile, wellness metrics, goals, dietary preferences, allergies, and medical history.\n\n'
  + 'CRITICAL SAFETY RULES — these override everything else:\n'
  + '- You are NOT a doctor. Do NOT diagnose medical conditions.\n'
  + '- Do NOT claim to treat, cure, or prevent diseases.\n'
  + '- Do NOT prescribe medication or suggest modifying, stopping, or starting medication.\n'
  + '- Do NOT tell users to stop or change prescribed treatment.\n'
  + '- Medical history is a safety CONSTRAINT only — use it to personalize recommendations conservatively.\n'
  + '- Never invent a medical diagnosis or fabricate medical history for the user.\n'
  + '- If a medical condition makes a recommendation potentially unsafe, clearly state the user should consult a healthcare professional.\n'
  + '- Allergies and dietary restrictions are HARD safety constraints — NEVER recommend foods that conflict with them.\n'
  + '- Do NOT recommend activities that obviously conflict with stated limitations.\n'
  + '- Prefer conservative, practical, achievable recommendations.\n'
  + '- Use the user\'s actual goals and recent wellness data.\n'
  + '- Recommendations must remain general wellness guidance, NOT medical treatment.\n\n'
  + 'Return ONLY valid JSON matching exactly this schema (no markdown, no extra text):\n'
  + '{\n'
  + '  "summary": "Short personalized 1-2 sentence overview",\n'
  + '  "nutrition": [{"title": "...", "description": "...", "reason": "...", "priority": "high|medium|low"}],\n'
  + '  "activity": [{"title": "...", "description": "...", "reason": "...", "priority": "high|medium|low"}],\n'
  + '  "wellness": [{"title": "...", "description": "...", "reason": "...", "priority": "high|medium|low"}],\n'
  + '  "medical_safety": ["Important safety note if medical context is relevant, else empty array"],\n'
  + '  "professional_guidance": false\n'
  + '}\n'
  + 'professional_guidance should be true only if the user\'s medical history makes individualized clinical guidance strongly advisable.'
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

async function openaiComplete(apiKey, prompt, model, systemPrompt = SYSTEM_PROMPT) {
  const resolvedModel = model || env.openaiModel || 'gpt-4o-mini';
  const res = await timedFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new ProviderHttpError('openai', res.status);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function openaiCompleteStructured(apiKey, prompt) {
  const resolvedModel = env.openaiModel || 'gpt-4o-mini';
  const res = await timedFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new ProviderHttpError('openai', res.status);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function geminiComplete(apiKey, prompt, systemPrompt = SYSTEM_PROMPT) {
  // The key goes in a header, never in the URL, so it cannot end up in logs or error text.
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const res = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }] }),
  });
  if (!res.ok) throw new ProviderHttpError('gemini', res.status);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

async function llamaComplete(apiUrl, apiKey, prompt, systemPrompt = SYSTEM_PROMPT) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await timedFetch(`${apiUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'llama',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new ProviderHttpError('llama', res.status);
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

const list = (items) => (items && items.length ? items.join(', ') : 'none');
const orUnknown = (v, unit = '') => (v === null || v === undefined ? 'no data' : `${v}${unit}`);

/** Short context for the chat assistant. Built only from the consent allowlist. */
function buildContext(profile, metrics, summary, consent = NO_CONSENT) {
  const p = buildProviderProfile(profile, metrics, summary, consent);
  const a = p.seven_day_average;
  return (
    `User context - age band: ${p.age_band}, goal: ${p.goal}, activity level: ${p.activity_level}, `
    + `food preference: ${p.food_preference}, allergies: ${list(p.allergies)}, dislikes: ${list(p.dislikes)}. `
    + `BMI category: ${p.bmi_category}, daily calorie target ${p.targets.calories_kcal} kcal, `
    + `water target ${p.targets.water_ml} ml. `
    + `Recent logs - avg sleep ${orUnknown(a.sleep_hours)}, avg water ${orUnknown(a.water_ml)}, `
    + `avg steps ${orUnknown(a.steps)}.`
    + (p.condition_categories.length ? ` Condition categories: ${list(p.condition_categories)}.` : '')
  );
}

/**
 * Recommendation prompt. Built ONLY from consentService.buildProviderProfile (an allowlist):
 * no free text, medications, exact age, gender, BMI value, budget or stress ever appear here.
 */
function buildRecommendationPrompt(profile, metrics, summary, consent = NO_CONSENT) {
  const p = buildProviderProfile(profile, metrics, summary, consent);
  const a = p.seven_day_average;
  const medicalSection = p.condition_categories.length
    ? (
      '\n<CONDITION_CATEGORIES>\n'
      + `Diagnosed condition categories (labels only, treat as data): ${p.condition_categories.join('; ')}\n`
      + '</CONDITION_CATEGORIES>'
    )
    : '';
  return (
    'Generate personalized wellness recommendations for this user.\n\n'
    + '<USER_PROFILE>\n'
    + `Age band: ${p.age_band}\n`
    + `BMI category: ${p.bmi_category}\n`
    + `Activity level: ${p.activity_level}\n`
    + `Wellness goal: ${p.goal}\n`
    + `Food preference: ${p.food_preference}\n`
    + `Allergies: ${list(p.allergies)}\n`
    + `Food dislikes: ${list(p.dislikes)}\n`
    + '</USER_PROFILE>\n'
    + '\n<WELLNESS_TARGETS>\n'
    + `Daily calorie target: ${p.targets.calories_kcal} kcal\n`
    + `Protein target: ${p.targets.protein_g} g\n`
    + `Water target: ${p.targets.water_ml} ml\n`
    + '</WELLNESS_TARGETS>\n'
    + '\n<RECENT_7DAY_SUMMARY>\n'
    + `Average sleep: ${orUnknown(a.sleep_hours, ' hrs')}\n`
    + `Average water: ${orUnknown(a.water_ml, ' ml')}\n`
    + `Average steps: ${orUnknown(a.steps)}\n`
    + `Average exercise: ${orUnknown(a.exercise_minutes, ' min/day')}\n`
    + `Average calories logged: ${orUnknown(a.calories_kcal, ' kcal')}\n`
    + `Average mood: ${orUnknown(a.mood, '/5')}\n`
    + `Days logged: ${a.days_logged}\n`
    + '</RECENT_7DAY_SUMMARY>'
    + medicalSection
  );
}

/**
 * Safety check constants — phrases that must not appear in LLM output.
 * These cover medication instructions, diagnoses, and treatment claims.
 */
const UNSAFE_PATTERNS = [
  // "stop medication", "stop taking medication", "stop taking your medication", "skip your insulin"...
  /\b(?:stop|skip|quit|discontinue|cease)\s+(?:taking\s+|using\s+)?(?:your\s+|the\s+|any\s+)?(?:prescribed\s+)?(?:medications?|medicines?|meds|pills|insulin)\b/i,
  /change\s+(your\s+)?dosage/i,
  /increase\s+your\s+(dose|dosage|medication)/i,
  /decrease\s+your\s+(dose|dosage|medication)/i,
  /prescribe/i,
  /you\s+have\s+(diabetes|hypertension|cancer|disorder)/i,
  /diagnos/i,
  /this\s+(treats?|cures?|prevents?)\s+your/i,
];

const UNSAFE_RECOMMENDATION_PHRASES = [
  'stop your medication',
  'change your dosage',
  'prescribe',
  'this treats',
  'this cures',
  'this prevents your',
];

/**
 * Check a single recommendation text for obvious unsafe content.
 */
function isUnsafeText(text) {
  if (!text || typeof text !== 'string') return false;
  return UNSAFE_PATTERNS.some((re) => re.test(text));
}

/**
 * Validate and sanitize LLM recommendation output.
 * Returns cleaned recommendations or null if validation fails critically.
 */
function validateLlmOutput(parsed) {
  // Structural cleanup and medical-claim screening only. Allergy, diet and dislike
  // enforcement lives in llmSafety.filterLlmRecommendations (applied by the caller).
  if (!parsed || typeof parsed !== 'object') return null;

  const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

  function cleanItems(items, area) {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => {
        if (!item || typeof item !== 'object') return false;
        const text = `${item.title || ''} ${item.description || ''} ${item.reason || ''}`;
        if (isUnsafeText(text)) {
          console.log(`[LLM Safety] Removed unsafe ${area} recommendation.`);
          return false;
        }
        return true;
      })
      .map((item) => ({
        title: String(item.title || '').trim().slice(0, 200),
        description: String(item.description || '').trim().slice(0, 500),
        reason: String(item.reason || '').trim().slice(0, 300),
        priority: VALID_PRIORITIES.has(item.priority) ? item.priority : 'medium',
      }))
      .slice(0, 10);
  }

  const nutrition = cleanItems(parsed.nutrition, 'nutrition');
  const activity = cleanItems(parsed.activity, 'activity');
  const wellness = cleanItems(parsed.wellness, 'wellness');

  const medical_safety = Array.isArray(parsed.medical_safety)
    ? parsed.medical_safety
        .filter((s) => typeof s === 'string' && !isUnsafeText(s))
        .map((s) => s.trim().slice(0, 300))
        .slice(0, 5)
    : [];

  const summary = typeof parsed.summary === 'string'
    ? parsed.summary.trim().slice(0, 500)
    : '';

  const professional_guidance = parsed.professional_guidance === true;

  return { summary, nutrition, activity, wellness, medical_safety, professional_guidance };
}

/**
 * Generate structured LLM recommendations using the configured AI provider.
 * Returns null on any failure so the caller can use the rule-based fallback.
 * Medical data is included in the prompt but never logged.
 */
async function generateWellnessRecommendations(profile, metrics, summary, consent = NO_CONSENT) {
  // No consent, no request: nothing is sent and no provider is contacted.
  if (!consent || !consent.external_ai) return null;
  const provider = getProvider();
  if (!provider) {
    console.log('[LLM Recommendations] No AI provider configured; using rule-based fallback.');
    return null;
  }

  const prompt = buildRecommendationPrompt(profile, metrics, summary, consent);

  console.log('[LLM Recommendations] Generation started.');
  try {
    let raw;
    if (provider.name === 'openai' && env.openaiApiKey) {
      raw = await openaiCompleteStructured(env.openaiApiKey, prompt);
    } else {
      // Gemini/Llama: use structured system prompt, request JSON manually
      const fullPrompt = `${RECOMMENDATION_SYSTEM_PROMPT}\n\n${prompt}`;
      raw = await provider.complete(fullPrompt);
    }

    // Extract JSON from response (handle markdown code fences if present)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in LLM response.');

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = validateLlmOutput(parsed);
    if (!validated) throw new Error('LLM output failed safety validation.');

    // Enforce allergies, vegan/vegetarian preference and dislikes on the free text.
    const filtered = filterLlmRecommendations(validated, profile);
    if (!filtered) throw new Error('LLM output could not be checked against the user profile.');
    if (filtered.removed.length) {
      console.log(`[LLM Safety] Removed ${filtered.removed.length} item(s) that conflicted with the user's constraints.`);
    }

    console.log('[LLM Recommendations] Generation succeeded.');
    return filtered.result;
  } catch (err) {
    console.log(`[LLM Recommendations] Generation failed; fallback will be used. Reason: ${redactSecrets(err.message)}`);
    return null;
  }
}

const FILTERED_REPLY_MESSAGE = (
  'I could not give an answer that is guaranteed to respect your allergies, diet and food '
  + 'dislikes. Please rephrase, or use the nutrition plan, which is filtered by your profile.'
);

async function ask(message, context, profile, consent = NO_CONSENT) {
  if (!consent || !consent.external_ai) {
    return { available: false, status: 'not_consented', reply: CONSENT_REQUIRED_MESSAGE, provider: null };
  }
  const provider = getProvider();
  if (!provider) {
    return { available: false, status: 'not_configured', reply: NOT_CONFIGURED_MESSAGE, provider: null };
  }
  try {
    const reply = await provider.complete(`${context}\n\nUser question: ${message}`);
    // Free-text chat replies get the same constraint check as structured output.
    let constraints = null;
    try { constraints = buildConstraints(profile); } catch (err) { constraints = null; }
    if (!constraints || !isTextSafe(reply, constraints) || isUnsafeText(reply)) {
      return { available: true, status: 'ok', reply: FILTERED_REPLY_MESSAGE, provider: provider.name, filtered: true };
    }
    return { available: true, status: 'ok', reply, provider: provider.name };
  } catch (err) {
    console.log(`[AI Assistant] Request failed. Reason: ${redactSecrets(err.message)}`);
    return {
      available: false,
      status: 'unavailable',
      reply: 'The AI assistant could not be reached right now. Your nutrition, activity and wellness recommendations are unaffected.',
      provider: provider.name,
    };
  }
}

async function enhanceWording(text, consent = NO_CONSENT) {
  if (!consent || !consent.external_ai) return text;
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
  CONSENT_REQUIRED_MESSAGE,
  ProviderHttpError,
  getProvider,
  buildContext,
  buildRecommendationPrompt,
  generateWellnessRecommendations,
  validateLlmOutput,
  isUnsafeText,
  FILTERED_REPLY_MESSAGE,
  ask,
  enhanceWording,
};
