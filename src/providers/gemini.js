/**
 * Google Gemini provider — example of a NON-OpenAI API shape.
 *
 * This file shows how the provider abstraction handles providers with a
 * completely different protocol (generateContent + parts instead of
 * messages), while exposing the exact same contract to callers.
 * https://ai.google.dev/gemini-api/docs
 */
import { ApiError, upstreamError } from '../core/errors.js';
import { postJson } from '../utils/http.js';
import { normalizeUsage } from './normalize.js';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

/** Map OpenAI-style roles to Gemini roles (assistant -> model). */
function buildContents(payload) {
  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    return payload.messages
      .filter((m) => m.role !== 'system') // system goes to systemInstruction
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  }
  return [{ role: 'user', parts: [{ text: payload.message }] }];
}

function buildSystemInstruction(payload) {
  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const systemText = payload.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    return systemText ? { parts: [{ text: systemText }] } : undefined;
  }
  return payload.systemPrompt ? { parts: [{ text: payload.systemPrompt }] } : undefined;
}

export const geminiProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  description: 'Google Gemini models (flash/pro) via the Generative Language API.',
  defaultModel: DEFAULT_MODEL,
  models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  requiredEnvKeys: ['GEMINI_API_KEY'],

  isConfigured(env = {}) {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
  },

  async chat(payload, { env = {}, config }) {
    if (!this.isConfigured(env)) {
      throw new ApiError(
        500,
        'Provider "Google Gemini" is not configured on the server. Set GEMINI_API_KEY.',
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    const model = payload.model || (env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
    const baseUrl = (env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

    const body = {
      contents: buildContents(payload),
      systemInstruction: buildSystemInstruction(payload),
      generationConfig: { temperature: payload.temperature },
    };
    if (payload.maxTokens) {
      body.generationConfig.maxOutputTokens = payload.maxTokens;
    }

    let result;
    try {
      result = await postJson(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY },
        body,
        timeoutMs: config.providerTimeoutMs,
      });
    } catch (error) {
      throw upstreamError('Google Gemini', { error });
    }
    if (!result.ok) {
      throw upstreamError('Google Gemini', {
        status: result.status,
        data: result.data,
        headers: result.headers,
      });
    }

    // Response shape: candidates[0].content.parts[*].text
    const candidate = result.data?.candidates?.[0];
    const reply = (candidate?.content?.parts || [])
      .map((part) => part.text)
      .filter(Boolean)
      .join('');

    if (typeof reply !== 'string' || reply.length === 0) {
      // Gemini can also return safety blocks — surface a clear error.
      const blockReason = candidate?.finishReason || result.data?.promptFeedback?.blockReason;
      throw new ApiError(
        502,
        `Google Gemini returned no content${blockReason ? ` (finishReason: ${blockReason})` : ''}.`,
        'MALFORMED_UPSTREAM_RESPONSE'
      );
    }

    return {
      reply,
      model,
      usage: normalizeUsage(result.data?.usageMetadata),
    };
  },
};
