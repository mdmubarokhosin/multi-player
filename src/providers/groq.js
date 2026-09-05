/**
 * Groq provider — ultra-fast inference for open models.
 * Groq speaks the OpenAI protocol, so this is pure configuration.
 * https://console.groq.com/docs
 */
import { createOpenAICompatible } from './openai-compatible.js';

export const groqProvider = createOpenAICompatible({
  id: 'groq',
  label: 'Groq',
  description: 'Ultra-fast LPU inference for open models (Llama, Gemma, DeepSeek distills).',
  defaultBaseUrl: 'https://api.groq.com/openai/v1',
  envKey: 'GROQ_API_KEY',
  modelEnvKey: 'GROQ_MODEL',
  defaultModel: 'llama-3.3-70b-versatile',
  models: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
    'deepseek-r1-distill-llama-70b',
  ],
});
