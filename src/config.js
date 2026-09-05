/**
 * Centralized configuration.
 *
 * Reads environment variables from whatever runtime the app is on:
 *   - Cloudflare Pages/Workers: `c.env` (dashboard environment variables)
 *   - Node.js: process.env (passed into app.fetch by server.node.js)
 *
 * Every value has a safe default so the API works out of the box.
 */

const APP_VERSION = '2.0.0';

/** Parse a comma-separated string into a trimmed, non-empty array. */
function splitList(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parse an integer env var with a fallback default. */
function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Build the effective configuration for one request.
 * @param {Record<string, string>} env - Runtime environment variables.
 */
export function getConfig(env = {}) {
  const origins = splitList(env.ALLOWED_ORIGINS);

  return {
    env,
    version: APP_VERSION,

    // Provider used when the request body has no "provider" field.
    defaultProvider: (env.DEFAULT_PROVIDER || 'openrouter').trim(),

    // When set, clients must send: X-API-Key: <value>
    apiSecretKey:
      env.API_SECRET_KEY && env.API_SECRET_KEY.trim() ? env.API_SECRET_KEY.trim() : null,

    // CORS allow-list. ['*'] means every origin is allowed.
    allowedOrigins: origins.length > 0 ? origins : ['*'],

    rateLimit: {
      global: {
        windowMs: toInt(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: toInt(env.RATE_LIMIT_MAX, 100),
      },
      chat: {
        windowMs: toInt(env.CHAT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
        max: toInt(env.CHAT_RATE_LIMIT_MAX, 15),
      },
    },

    validation: {
      maxMessageLength: toInt(env.MAX_MESSAGE_LENGTH, 8000),
      maxMessages: toInt(env.MAX_MESSAGES, 50),
      maxTokensLimit: toInt(env.MAX_TOKENS_LIMIT, 8192),
    },

    // Max time (ms) to wait for an upstream provider response.
    providerTimeoutMs: toInt(env.PROVIDER_TIMEOUT_MS, 60000),

    isProduction: (env.NODE_ENV || 'development') === 'production',
  };
}

export { APP_VERSION };
