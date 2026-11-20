/**
 * Remove credentials from text before it is logged or returned in an error.
 * Covers API keys in URLs and headers, bearer tokens, and any configured key value.
 */
const { env } = require('../config/env');

const PATTERNS = [
  [/([?&](?:key|api_key|apikey|access_token)=)[^&\s"']+/gi, '$1[redacted]'],
  [/(x-goog-api-key["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1[redacted]'],
  [/(authorization["']?\s*[:=]\s*["']?(?:bearer\s+)?)[^\s"',}]+/gi, '$1[redacted]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g, 'Bearer [redacted]'],
  [/\bsk-[A-Za-z0-9_-]{8,}/g, '[redacted]'],
  [/\bAIza[0-9A-Za-z_-]{20,}/g, '[redacted]'],
];

function redactSecrets(value) {
  let text = String(value ?? '');
  for (const secret of [env.openaiApiKey, env.geminiApiKey, env.llamaApiKey]) {
    if (secret && secret.length >= 8) text = text.split(secret).join('[redacted]');
  }
  for (const [re, replacement] of PATTERNS) text = text.replace(re, replacement);
  return text;
}

module.exports = { redactSecrets };
