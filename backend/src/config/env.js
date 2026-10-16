const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true' || String(value) === '1';
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wellness_db',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-me',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES || 120),
  sessionCookieSecure: bool(process.env.SESSION_COOKIE_SECURE, false),
  mlServiceUrl: (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
  mlEnabled: bool(process.env.ML_ENABLED, true),
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 4000),
  // Shared secret sent to the FastAPI service as X-Internal-Token.
  mlInternalToken: process.env.ML_INTERNAL_TOKEN || '',
  // Comma-separated emails allowed to run admin actions such as model retraining.
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Share of CONSENTING users randomly held out from ML adjustment (rules only), so the
  // effect of the model can later be measured. 0 = no holdout (default).
  mlControlFraction: Math.min(1, Math.max(0, Number(process.env.ML_CONTROL_FRACTION || 0) || 0)),
  aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  llamaApiUrl: process.env.LLAMA_API_URL || '',
  llamaApiKey: process.env.LLAMA_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = { env };
