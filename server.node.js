/**
 * Local Node.js server (no Cloudflare tooling required).
 *
 * Runs the EXACT same Hono app that Cloudflare Pages Functions run — the
 * only difference is where environment variables come from:
 *   - here: process.env (+ optional .env file via dotenv)
 *   - CF  : dashboard environment variables, injected as c.env
 *
 * Usage:  npm run dev:node     (or npm start)
 */
import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './src/index.js';

const port = Number.parseInt(process.env.PORT, 10) || 5000;

serve(
  {
    // Inject process.env as the Hono "env" so config/providers see it.
    fetch: (request) => app.fetch(request, process.env),
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`[READY] AI Gateway API (Node) on http://localhost:${info.port}`);
    console.log('[READY] Endpoints: GET /health | GET /api/v1/health | GET /api/v1/providers | POST /api/v1/chat');
  }
);
