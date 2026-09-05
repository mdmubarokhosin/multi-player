# AI Gateway API

A production-ready, **multi-provider AI gateway REST API**. One consistent endpoint for
any AI provider — OpenRouter, Groq, Google Gemini, or **any custom OpenAI-compatible
server** — with a pluggable provider architecture that lets you add a new provider in
minutes.

Deploys out of the box on **Cloudflare Pages** (serverless Functions) and also runs on
plain **Node.js** for local development or self-hosting.

```
                 ┌──────────────────────────────┐
   POST          │        AI Gateway API        │   OpenRouter  ──> z-ai/glm-5.2:free
  /api/v1/chat ──>│  validate -> route provider  │──> Groq       ──> llama-3.3-70b
   {message,      │  (Hono, runtime-agnostic)    │──> Gemini     ──> gemini-2.0-flash
    provider,     └──────────────────────────────┘──> Custom     ──> ANY OpenAI-compatible
    model, ...)                 ^                                        base URL
                                │
                    runs on Cloudflare Pages Functions
                    or Node.js 18+ (same codebase)
```

## Features

- **Multi-provider architecture** — a registry + adapter pattern. Providers are
  self-contained modules in `src/providers/`; adding one is ~15 lines (or **zero
  code** for OpenAI-compatible endpoints via `CUSTOM_*` env vars).
- **Per-request provider switching** — clients choose `"provider": "groq"` etc.; the
  server default comes from `DEFAULT_PROVIDER`.
- **Two input styles** — simple `{ message }` or full multi-turn `{ messages: [...] }`.
- **Consistent envelopes** — every response, success or failure, follows one JSON shape.
- **Typed upstream error mapping** — auth failures, credit exhaustion, rate limits,
  timeouts, network errors and malformed responses all get explicit error codes (and
  `Retry-After` hints where providers supply them).
- **Optional API key protection** — lock YOUR gateway with `API_SECRET_KEY`
  (`X-API-Key` header), constant-time comparison.
- **Two-layer rate limiting** (global + chat) — sliding window, per-isolate on
  Cloudflare (see notes), configurable via env.
- **CORS allow-list**, security headers, 404/JSON error handlers.
- **Landing page** — static, self-contained status page served at `/` (live health +
  provider status).
- **Zero-config build for Cloudflare Pages** — `npm run build` -> `out/`.
- **Smoke-test script** — verify any deployment (local or deployed) in one command.

## Tech Stack

| Layer      | Choice                                        | Why |
| ---------- | --------------------------------------------- | --- |
| Framework  | [Hono](https://hono.dev) (JavaScript)         | Runs natively on Cloudflare Workers/Pages **and** Node.js with the same code |
| HTTP       | Global `fetch` + AbortController              | Axios is unreliable on the Workers runtime |
| Runtime    | Cloudflare Pages Functions / Node.js >= 18    | Serverless or self-hosted |
| Tooling    | wrangler (dev), dotenv (Node dev)             | Standard Cloudflare workflow |

## Project Structure

```
ai-gateway-api/
├── functions/                          # Cloudflare Pages Functions (API, serverless)
│   ├── api/
│   │   └── [[route]].js                #   catches /api/*  -> Hono app
│   └── health.js                       #   catches /health -> Hono app (legacy path)
├── public/                             # Static site -> copied to out/ by build
│   ├── index.html                      #   landing/status page
│   └── _headers                        #   security headers for static assets
├── scripts/
│   ├── build.mjs                       # npm run build  -> out/  (CI-safe, no deps)
│   └── smoke-test.mjs                  # endpoint test suite (node scripts/smoke-test.mjs)
├── src/
│   ├── config.js                       # env -> effective config (CF env or process.env)
│   ├── index.js                        # Hono app: middleware pipeline + routes
│   ├── core/
│   │   ├── errors.js                   # ApiError + upstream error mapping
│   │   └── validate.js                 # chat payload validation/normalization
│   ├── providers/
│   │   ├── base.js                     # PROVIDER CONTRACT (read me first)
│   │   ├── normalize.js                # usage normalization across providers
│   │   ├── openai-compatible.js        # factory: any OpenAI-protocol provider
│   │   ├── openrouter.js               # OpenRouter (default, z-ai/glm-5.2:free)
│   │   ├── groq.js                     # Groq
│   │   ├── gemini.js                   # Google Gemini (non-OpenAI shape example)
│   │   ├── custom.js                   # ANY custom OpenAI-compatible endpoint
│   │   ├── _template.js                # copy-me skeleton for new providers
│   │   └── registry.js                 # registration + discovery
│   ├── middleware/
│   │   ├── rate-limit.js               # sliding-window limiter (global + chat)
│   │   ├── security.js                 # optional X-API-Key auth
│   │   └── error-handler.js            # centralized JSON error envelopes
│   ├── routes/
│   │   ├── health.js                   # GET  /api/v1/health, /health
│   │   ├── providers.js                # GET  /api/v1/providers
│   │   └── chat.js                     # POST /api/v1/chat
│   └── utils/
│       └── http.js                     # fetch + timeout helper
├── server.node.js                      # local Node server (@hono/node-server)
├── wrangler.toml                       # Cloudflare Pages config (output: out)
├── .env.example                        # Node/.env template
├── .dev.vars.example                   # Cloudflare local-dev template
├── DEPLOYMENT.md                       # step-by-step GitHub -> Cloudflare Pages guide
├── package.json
└── README.md
```

## Quick Start

### A. Deploy to Cloudflare Pages (recommended)

1. Push this folder to a GitHub repository.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo and use this build configuration:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | **Build command** | `npm run build` |
   | **Build output directory** | `out` |
   | Root directory | *(empty)* |

4. Add environment variables (Production + Preview): at minimum
   `OPENROUTER_API_KEY` (see the full table below).
5. Deploy → your API is live at `https://<project>.pages.dev`.

Full illustrated walkthrough, troubleshooting and custom-domain notes:
[DEPLOYMENT.md](./DEPLOYMENT.md).

### B. Run locally with Cloudflare tooling

```bash
npm install
cp .dev.vars.example .dev.vars     # then set your provider keys
npm run dev                        # http://localhost:8788  (wrangler pages dev)
```

### C. Run locally on plain Node.js

```bash
npm install
cp .env.example .env               # then set your provider keys
npm run dev:node                   # http://localhost:5000
```

## API Reference

Base URL: `https://<project>.pages.dev` (Cloudflare) or `http://localhost:5000` (Node).

### `GET /api/v1/health`  (public; `GET /health` also works)

```json
{ "status": "ok", "timestamp": "2026-09-05T10:00:00.000Z", "version": "2.0.0", "defaultProvider": "openrouter" }
```

### `GET /api/v1/providers`

```json
{
  "success": true,
  "defaultProvider": "openrouter",
  "total": 4,
  "providers": [
    {
      "id": "openrouter",
      "label": "OpenRouter",
      "description": "Unified gateway to 200+ models ...",
      "defaultModel": "z-ai/glm-5.2:free",
      "models": ["z-ai/glm-5.2:free", "..."],
      "requiredEnvKeys": ["OPENROUTER_API_KEY"],
      "configured": true
    }
  ]
}
```

### `POST /api/v1/chat`

**Request body**

| Field           | Type   | Required              | Default           | Notes |
| --------------- | ------ | --------------------- | ----------------- | ----- |
| `message`       | string | one of message/messages | —               | Simple single-turn input |
| `messages`      | array  | one of message/messages | —               | Multi-turn: `[{role: system\|user\|assistant, content}]`, max 50 |
| `provider`      | string | no                    | `DEFAULT_PROVIDER`| One of: `openrouter`, `groq`, `gemini`, `custom` |
| `model`         | string | no                    | provider default  | Any model id supported by that provider |
| `system_prompt` | string | no                    | null              | System instruction |
| `temperature`   | number | no                    | 0.7               | 0 – 2 |
| `max_tokens`    | int    | no                    | provider default  | 1 – `MAX_TOKENS_LIMIT` (8192) |

**Simple request**

```bash
curl -X POST http://localhost:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the meaning of life?"}'
```

```json
{
  "success": true,
  "provider": "openrouter",
  "reply": "AI response content ...",
  "model": "z-ai/glm-5.2:free",
  "usage": { "prompt_tokens": 12, "completion_tokens": 148, "total_tokens": 160 }
}
```

**Multi-turn + provider switch + tuning**

```bash
curl -X POST http://localhost:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "system", "content": "You are a concise senior backend engineer."},
      {"role": "user", "content": "Explain REST APIs in one paragraph."}
    ],
    "temperature": 0.4,
    "max_tokens": 300
  }'
```

**Error responses** always use one envelope:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "field": "message" } } }
```

## Error Codes

| HTTP | Code                          | Meaning                                             |
| ---- | ----------------------------- | --------------------------------------------------- |
| 400  | `VALIDATION_ERROR`            | Payload failed validation (`error.details` says why) |
| 400  | `INVALID_JSON`                | Body is not valid JSON                              |
| 400  | `UNKNOWN_PROVIDER`            | `provider` not registered (see `details.availableProviders`) |
| 401  | `UNAUTHORIZED`                | Missing/wrong `X-API-Key` (when `API_SECRET_KEY` set) |
| 402  | `UPSTREAM_CREDITS_EXHAUSTED`  | Provider says credits/quota exhausted               |
| 404  | `ROUTE_NOT_FOUND`             | Unknown route                                       |
| 429  | `RATE_LIMITED`                | This gateway's own rate limit hit                   |
| 429  | `UPSTREAM_RATE_LIMIT`         | Provider throttled us (`details.retryAfterSeconds`) |
| 500  | `UPSTREAM_AUTH_ERROR`         | Provider rejected the server-side API key           |
| 500  | `PROVIDER_NOT_CONFIGURED`     | Provider selected but its env keys are missing      |
| 500  | `INTERNAL_ERROR`              | Unexpected server error                             |
| 502  | `UPSTREAM_ERROR`              | Provider returned an unexpected error               |
| 502  | `NETWORK_ERROR`               | Could not reach the provider                        |
| 502  | `MALFORMED_UPSTREAM_RESPONSE` | Unexpected response shape from the provider         |
| 503  | `UPSTREAM_UNAVAILABLE`        | Provider temporarily down                           |
| 504  | `UPSTREAM_TIMEOUT`            | Provider did not respond in time                    |

## Securing Your Gateway

Set `API_SECRET_KEY` in the provider's environment variables. Every `/api/v1/*`
request (except health) then requires:

```bash
curl -X POST https://<project>.pages.dev/api/v1/chat \
  -H "X-API-Key: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

`Authorization: Bearer YOUR_SECRET` is also accepted. Keep `API_SECRET_KEY` unset in
development for open access.

## Rate Limits

| Scope | Default | Env vars |
| --- | --- | --- |
| All `/api/v1/*` | 100 requests / 15 min / IP | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| `POST /api/v1/chat` | 15 requests / 1 min / IP | `CHAT_RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_WINDOW_MS` |

Responses include `X-RateLimit-Limit` / `X-RateLimit-Remaining`, and 429s include
`Retry-After`.

> **Cloudflare note:** Pages Functions run across many isolates, so this limiter is a
> per-isolate soft cap — ideal for basic abuse protection. For hard, exact quotas at
> scale, add a Cloudflare WAF rate-limiting rule on `/api/v1/chat` (one click in the
> dashboard) or swap in a KV/Durable Object counter.

## Adding a New Provider

### Way 1 — zero code (any OpenAI-compatible endpoint)

Set three env vars and restart/redeploy:

```env
CUSTOM_BASE_URL=https://api.deepseek.com/v1
CUSTOM_API_KEY=sk-...
CUSTOM_MODEL=deepseek-chat
```

Then call it: `{"provider": "custom", "message": "hello"}`. Works with OpenAI,
DeepSeek, Together, Fireworks, vLLM, Ollama (`http://localhost:11434/v1`, key
optional), LM Studio, and every other OpenAI-protocol server.

### Way 2 — a new provider module (custom protocols)

1. Copy the skeleton: `cp src/providers/_template.js src/providers/mistral.js`
2. Implement `chat()` (if the provider speaks the OpenAI protocol, prefer the
   factory — see `groq.js`, which is ~20 lines).
3. Register it in `src/providers/registry.js`:

```js
import { mistralProvider } from './mistral.js';
const BUILT_IN_PROVIDERS = [openrouterProvider, groqProvider, geminiProvider, customProvider, mistralProvider];
```

4. Redeploy. `GET /api/v1/providers` lists it; clients can target it immediately.

The full contract (fields, rules, helpers) is documented at the top of
[`src/providers/base.js`](./src/providers/base.js).

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEFAULT_PROVIDER` | `openrouter` | Provider used when the request has no `provider` |
| `OPENROUTER_API_KEY` | — | OpenRouter key (required for that provider) |
| `OPENROUTER_MODEL` (or legacy `MODEL_NAME`) | `z-ai/glm-5.2:free` | OpenRouter model override |
| `GROQ_API_KEY` / `GROQ_MODEL` | — / `llama-3.3-70b-versatile` | Groq |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — / `gemini-2.0-flash` | Google Gemini |
| `CUSTOM_BASE_URL` / `CUSTOM_API_KEY` / `CUSTOM_MODEL` | — | Custom OpenAI-compatible provider |
| `API_SECRET_KEY` | — | Protects this gateway (`X-API-Key`); empty = open |
| `ALLOWED_ORIGINS` | `*` | CORS allow-list (comma-separated) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | 100 / 900000 | Global limiter |
| `CHAT_RATE_LIMIT_MAX` / `CHAT_RATE_LIMIT_WINDOW_MS` | 15 / 60000 | Chat limiter |
| `MAX_MESSAGE_LENGTH` / `MAX_MESSAGES` / `MAX_TOKENS_LIMIT` | 8000 / 50 / 8192 | Validation caps |
| `PROVIDER_TIMEOUT_MS` | 60000 | Upstream request timeout |
| `APP_URL` | — | Sent to OpenRouter as `HTTP-Referer` attribution |
| `NODE_ENV` | `development` | `production` hides stack traces |
| `PORT` | `5000` | Node server port only |

## Smoke Tests

```bash
# against local Node server
npm run smoke

# against a deployed Cloudflare Pages URL (read-only checks)
BASE_URL=https://your-project.pages.dev npm run smoke

# include a real end-to-end chat call
BASE_URL=https://your-project.pages.dev RUN_E2E=1 npm run smoke
```

A healthy deployment passes every check. During `RUN_E2E`, a free-tier provider that
answers `429 UPSTREAM_RATE_LIMIT` counts as a soft pass — the chain works, the shared
pool is just busy.

## বাংলা কুইক স্টার্ট

1. এই ফোল্ডারটি একটি GitHub রিপোতে push করুন।
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git।
3. Build configuration: **Build command** = `npm run build`, **Build output** = `out`,
   **Root directory** = খালি।
4. Environment variables-এ `OPENROUTER_API_KEY` দিন (Production + Preview দুটোতেই)।
5. Deploy করুন — API লাইভ: `https://<project>.pages.dev/api/v1/chat`।

নতুন provider যোগ করতে: `CUSTOM_BASE_URL` / `CUSTOM_API_KEY` / `CUSTOM_MODEL` সেট করুন
(কোনো কোড লাগবে না), অথবা `src/providers/_template.js` কপি করে নিজের provider লিখুন।

## Roadmap

- SSE streaming responses (`POST /api/v1/chat/stream`)
- KV/Durable-Object-backed rate limiting & usage quotas per API key
- Per-client API keys with dashboards
- Response caching for identical prompts

## License

MIT — see [LICENSE](./LICENSE).
