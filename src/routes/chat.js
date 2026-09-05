/**
 * POST /api/v1/chat
 *
 * The main endpoint. Flow:
 *   1. Parse JSON body (invalid JSON -> 400 INVALID_JSON).
 *   2. Validate + normalize the payload (core/validate.js).
 *   3. Resolve the requested provider from the registry (default: DEFAULT_PROVIDER).
 *   4. Verify the provider is configured on the server.
 *   5. Call the provider and wrap the result in the success envelope:
 *      { success, provider, reply, model, usage }
 */
import { ApiError } from '../core/errors.js';
import { parseChatPayload } from '../core/validate.js';
import { getProvider, getProviderIds } from '../providers/registry.js';

export async function chatHandler(c) {
  // 1) Parse body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(400, 'Request body contains invalid JSON.', 'INVALID_JSON');
  }

  // 2) Validate + normalize
  const cfg = c.get('config');
  const payload = parseChatPayload(body, cfg);

  // 3) Resolve provider
  const requestedProvider = payload.provider || cfg.defaultProvider;
  const provider = getProvider(requestedProvider);
  if (!provider) {
    throw new ApiError(
      400,
      `Unknown provider "${requestedProvider}".`,
      'UNKNOWN_PROVIDER',
      { availableProviders: getProviderIds() }
    );
  }

  // 4) Configuration pre-check (fail fast with an actionable message)
  if (!provider.isConfigured(c.env || {})) {
    throw new ApiError(
      500,
      `Provider "${provider.label}" is not configured on the server. Missing: ${provider.requiredEnvKeys.join(', ') || 'see README'}.`,
      'PROVIDER_NOT_CONFIGURED'
    );
  }

  // 5) Call provider (all upstream failures are already typed ApiErrors)
  const result = await provider.chat(payload, { env: c.env || {}, config: cfg });

  return c.json({
    success: true,
    provider: provider.id,
    reply: result.reply,
    model: result.model,
    usage: result.usage,
  });
}
