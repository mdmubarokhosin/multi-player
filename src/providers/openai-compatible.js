/**
 * FACTORY: OpenAI-compatible chat-completions provider.
 *
 * A huge portion of AI providers speak the OpenAI protocol
 * (POST {base}/chat/completions). This factory turns a small config object
 * into a fully working provider with auth, timeout, error mapping, model
 * resolution and usage normalization — so adding such a provider costs
 * ~15 lines (see openrouter.js / groq.js).
 */
import { ApiError, upstreamError } from '../core/errors.js';
import { postJson } from '../utils/http.js';
import { buildOpenAIMessages, normalizeUsage } from './base.js';

/**
 * @param {Object} spec
 * @param {string} spec.id                 - Provider id ("openrouter").
 * @param {string} spec.label              - Display name ("OpenRouter").
 * @param {string} spec.description        - For GET /api/v1/providers.
 * @param {string|null} spec.defaultBaseUrl - Fixed base URL (or null when baseUrlEnvKey used).
 * @param {string|null} [spec.baseUrlEnvKey] - Env var holding a custom base URL.
 * @param {string} spec.envKey             - Env var holding the API key.
 * @param {boolean} [spec.apiKeyOptional]  - Allow endpoints without a key (e.g. Ollama).
 * @param {string} spec.modelEnvKey        - Env var overriding the default model.
 * @param {string[]} [spec.extraModelEnvKeys] - Legacy/alternative env aliases.
 * @param {string|null} spec.defaultModel  - Fallback model id.
 * @param {string[]} [spec.models]         - Informational model list.
 * @param {Function} [spec.extraHeadersFn] - (env) => extra request headers.
 * @param {boolean} [spec.supportsMaxTokens] - Send max_tokens upstream (default true).
 */
export function createOpenAICompatible(spec) {
  const {
    id,
    label,
    description,
    defaultBaseUrl,
    baseUrlEnvKey = null,
    envKey,
    apiKeyOptional = false,
    modelEnvKey,
    extraModelEnvKeys = [],
    defaultModel,
    models = [],
    extraHeadersFn = null,
    supportsMaxTokens = true,
  } = spec;

  const requiredEnvKeys = [
    ...(baseUrlEnvKey ? [baseUrlEnvKey] : []),
    ...(!apiKeyOptional ? [envKey] : []),
  ];

  function resolveModel(env) {
    for (const key of [modelEnvKey, ...extraModelEnvKeys]) {
      if (env[key] && env[key].trim()) return env[key].trim();
    }
    return defaultModel;
  }

  return {
    id,
    label,
    description,
    defaultModel,
    models,
    requiredEnvKeys,

    isConfigured(env = {}) {
      if (baseUrlEnvKey && !env[baseUrlEnvKey]) return false;
      if (!defaultBaseUrl && !baseUrlEnvKey) return false;
      if (!apiKeyOptional && !env[envKey]) return false;
      return true;
    },

    async chat(payload, { env = {}, config }) {
      // --- Configuration checks with actionable error messages ---
      if (!this.isConfigured(env)) {
        throw new ApiError(
          500,
          `Provider "${label}" is not configured on the server. Set ${requiredEnvKeys.join(', ') || envKey}.`,
          'PROVIDER_NOT_CONFIGURED'
        );
      }
      const model = payload.model || resolveModel(env);
      if (!model) {
        throw new ApiError(
          500,
          `Provider "${label}" needs a model. Set ${modelEnvKey} or pass "model" in the request.`,
          'PROVIDER_NOT_CONFIGURED'
        );
      }

      const baseUrl = String(baseUrlEnvKey ? env[baseUrlEnvKey] : defaultBaseUrl).replace(/\/+$/, '');

      // --- Build the OpenAI-compatible request ---
      const body = {
        model,
        messages: buildOpenAIMessages(payload),
        temperature: payload.temperature,
      };
      if (supportsMaxTokens && payload.maxTokens) {
        body.max_tokens = payload.maxTokens;
      }

      const apiKey = env[envKey];
      const headers = {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(extraHeadersFn ? extraHeadersFn(env) : {}),
      };

      // --- Call upstream + map failures into typed ApiErrors ---
      let result;
      try {
        result = await postJson(`${baseUrl}/chat/completions`, {
          headers,
          body,
          timeoutMs: config.providerTimeoutMs,
        });
      } catch (error) {
        throw upstreamError(label, { error });
      }
      if (!result.ok) {
        throw upstreamError(label, { status: result.status, data: result.data, headers: result.headers });
      }

      // --- Extract the reply ---
      const reply = result.data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string') {
        throw new ApiError(
          502,
          `${label} returned a malformed response (missing choices[0].message.content).`,
          'MALFORMED_UPSTREAM_RESPONSE'
        );
      }

      return {
        reply,
        model: result.data?.model || model,
        usage: normalizeUsage(result.data?.usage),
      };
    },
  };
}
