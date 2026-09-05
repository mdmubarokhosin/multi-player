# Deploying AI Gateway API on Cloudflare Pages

This project is built specifically for **GitHub → Cloudflare Pages**. Follow these
steps exactly; total time is about 5 minutes.

## 1. Push to GitHub

```bash
cd ai-gateway-api
git init
git add .
git commit -m "AI Gateway API v2 — multi-provider, Cloudflare Pages ready"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> Secrets are safe to push: `.env`, `.dev.vars` and all key files are git-ignored.
> Only `.env.example` / `.dev.vars.example` templates are committed.

## 2. Create the Pages project

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) →
   **Workers & Pages** → **Create application** → **Pages** tab →
   **Connect to Git**.
2. Authorize GitHub and select the repository you just pushed.
3. In **Set up builds and deployments**, use this exact configuration:

| Field | Value |
| --- | --- |
| Project name | any name (this becomes `https://<name>.pages.dev`) |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |
| **Root directory** | *(leave empty / `/`)* |

> If Cloudflare asks for an Advanced path/monorepo setting, keep the default —
> `functions/` and `public/` must be at the repository root, which is exactly how
> this project is structured.

## 3. Set environment variables

In your new Pages project: **Settings → Environment variables → Add** —
add the variables for **Production** (and repeat for **Preview** if you want
preview branches to work too).

Minimum required (choose your default provider and set its key):

| Variable | Example value |
| --- | --- |
| `DEFAULT_PROVIDER` | `openrouter` |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |

Optional extras (enable more providers / harden the gateway):

| Variable | Example value |
| --- | --- |
| `GROQ_API_KEY` | `gsk_...` |
| `GEMINI_API_KEY` | `AIza...` |
| `CUSTOM_BASE_URL` | `https://api.deepseek.com/v1` |
| `CUSTOM_API_KEY` | `sk-...` |
| `CUSTOM_MODEL` | `deepseek-chat` |
| `API_SECRET_KEY` | a long random string (locks your gateway; clients send `X-API-Key`) |
| `ALLOWED_ORIGINS` | `https://yoursite.com` (or `*`) |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` (optional; pins the CI Node version) |

## 4. Deploy

Click **Save and Deploy**. The first build does:

1. `npm ci` / `npm install` (installs `hono` + tooling)
2. `npm run build` → copies `public/` to `out/` (landing page + `_headers`)
3. Cloudflare bundles `functions/` → your API runs as serverless Functions

When it finishes you get `https://<project>.pages.dev`. Every `git push` to `main`
redeploys automatically; pull requests get preview deployments.

## 5. Verify the deployment

```bash
# Health (public)
curl https://<project>.pages.dev/api/v1/health

# Provider discovery (shows which providers are configured)
curl https://<project>.pages.dev/api/v1/providers

# Real chat call
curl -X POST https://<project>.pages.dev/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the meaning of life?"}'

# Full automated check (from your machine, Node 18+):
BASE_URL=https://<project>.pages.dev RUN_E2E=1 npm run smoke
```

Also open `https://<project>.pages.dev/` in a browser — the landing page shows a
live status pill and provider cards.

## Custom domain (optional)

Pages project → **Custom domains → Set up a custom domain** → follow the prompts.
Cloudflare handles DNS + TLS automatically; your API is then available on your own
domain with the same paths.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `405` or HTML on `/api/v1/...` | The `functions/` folder is missing at the repo root, or Root directory was set to a subfolder. Keep the repo layout as-is and Root directory empty. |
| Build succeeds but providers show `configured: false` | Environment variables missing on that environment (Production vs Preview). Re-check Settings → Environment variables. |
| `500 UPSTREAM_AUTH_ERROR` | The provider key is wrong/revoked — regenerate it and update the env var, then redeploy. |
| `429 UPSTREAM_RATE_LIMIT` on free models | The provider's shared free pool is busy. Retry with backoff (the response includes `retryAfterSeconds`), or switch `provider` / use a paid model. |
| `429 RATE_LIMITED` | Your own gateway's limiter. Raise `RATE_LIMIT_MAX` / `CHAT_RATE_LIMIT_MAX`, or add a Cloudflare WAF rule for hard limits. |
| Node version warnings during build | Set `NODE_VERSION` env var to `22`. |
| Want to see live logs | `npx wrangler pages deployment tail --project-name=<project>` |

## Updating later

Edit any file → commit → push. Rebuilds are automatic. To add a provider:

- **No code:** set `CUSTOM_BASE_URL` / `CUSTOM_API_KEY` / `CUSTOM_MODEL` in the
  dashboard and redeploy.
- **Custom protocol:** add a module in `src/providers/` (copy `_template.js`),
  register it in `registry.js`, push.

For local development and debugging before pushing, see README → Quick Start
(`npm run dev` for wrangler, `npm run dev:node` for plain Node).
