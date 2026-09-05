/**
 * PROVIDER REGISTRY — the single place where providers are registered.
 *
 * ADD A NEW PROVIDER IN 2 LINES:
 *   1. import { myProvider } from './my-provider.js';
 *   2. add it to BUILT_IN_PROVIDERS below.
 *
 * Or use the zero-code route: configure the "custom" provider with
 * CUSTOM_BASE_URL / CUSTOM_API_KEY / CUSTOM_MODEL for any OpenAI-compatible
 * endpoint — no code changes needed.
 */
import { openrouterProvider } from './openrouter.js';
import { groqProvider } from './groq.js';
import { geminiProvider } from './gemini.js';
import { customProvider } from './custom.js';

/** All providers available to the gateway. Order = listing order. */
const BUILT_IN_PROVIDERS = [openrouterProvider, groqProvider, geminiProvider, customProvider];

const registry = new Map();

/**
 * Register a provider (exposed for extensibility/plugins).
 * @param {Object} provider - Object matching the contract in providers/base.js
 */
export function registerProvider(provider) {
  if (!provider?.id || typeof provider.chat !== 'function') {
    throw new Error('registerProvider: invalid provider (needs id + chat()).');
  }
  if (registry.has(provider.id)) {
    throw new Error(`registerProvider: duplicate provider id "${provider.id}".`);
  }
  registry.set(provider.id, provider);
}

// Register all built-ins.
BUILT_IN_PROVIDERS.forEach(registerProvider);

/** Look up a provider by id (case-insensitive, trims input). */
export function getProvider(id) {
  return registry.get(String(id || '').trim().toLowerCase()) || null;
}

/** All registered provider ids. */
export function getProviderIds() {
  return [...registry.keys()];
}

/** Public metadata list for GET /api/v1/providers. */
export function listProviders(env = {}) {
  return [...registry.values()].map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    defaultModel: p.defaultModel,
    models: p.models,
    requiredEnvKeys: p.requiredEnvKeys,
    configured: Boolean(p.isConfigured?.(env)),
  }));
}
