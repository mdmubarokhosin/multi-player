/**
 * Smoke-test suite for the AI Gateway API (no dependencies, Node 18+).
 *
 * Usage:
 *   node scripts/smoke-test.mjs                                 # against http://localhost:5000
 *   BASE_URL=http://localhost:8788 node scripts/smoke-test.mjs  # against wrangler pages dev
 *   BASE_URL=https://my-project.pages.dev RUN_E2E=1 node scripts/smoke-test.mjs
 *
 * RUN_E2E=1 additionally performs a REAL chat call (needs a configured
 * provider). A 429 UPSTREAM_RATE_LIMIT from a free tier counts as a soft
 * pass — it proves the full chain works and the provider is just throttled.
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const RUN_E2E = process.env.RUN_E2E === '1' || process.argv.includes('--e2e');
// If the gateway is protected with API_SECRET_KEY, pass the same value here.
const API_KEY = process.env.API_KEY || '';

function headers(extra = {}) {
  return API_KEY ? { 'X-API-Key': API_KEY, ...extra } : extra;
}

const results = [];
let softWarnings = 0;

async function call(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* non-JSON */
  }
  return { status: response.status, body };
}

function record(name, pass, info = '') {
  results.push({ name, pass, info });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`);
}

async function main() {
  console.log(`\nSmoke-testing: ${BASE_URL}\n`);

  // 1. Health probes
  try {
    const { status, body } = await call('/api/v1/health');
    record('GET /api/v1/health -> 200 {status:"ok"}', status === 200 && body?.status === 'ok', `status=${status}`);
  } catch (e) {
    record('GET /api/v1/health', false, e.message);
  }

  try {
    const { status } = await call('/health');
    record('GET /health (legacy) -> 200', status === 200, `status=${status}`);
  } catch (e) {
    record('GET /health (legacy)', false, e.message);
  }

  // 2. Provider discovery
  try {
    const { status, body } = await call('/api/v1/providers', { headers: headers() });
    const count = Array.isArray(body?.providers) ? body.providers.length : 0;
    record('GET /api/v1/providers -> 200 with providers[]', status === 200 && body?.success === true && count > 0, `${count} provider(s)`);
  } catch (e) {
    record('GET /api/v1/providers', false, e.message);
  }

  // 3. Auth layer (only meaningful when the gateway is key-protected)
  if (API_KEY) {
    try {
      const { status, body } = await call('/api/v1/providers'); // no key sent
      record('Auth: request without key -> 401 UNAUTHORIZED', status === 401 && body?.error?.code === 'UNAUTHORIZED', `status=${status}`);
    } catch (e) {
      record('Auth: request without key', false, e.message);
    }
  }

  // 4. Validation errors
  try {
    const { status, body } = await call('/api/v1/chat', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    });
    record('POST /chat {} -> 400 VALIDATION_ERROR', status === 400 && body?.error?.code === 'VALIDATION_ERROR', `status=${status}`);
  } catch (e) {
    record('POST /chat {} validation', false, e.message);
  }

  try {
    const { status, body } = await call('/api/v1/chat', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: '   ' }),
    });
    record('POST /chat {"message":"   "} -> 400', status === 400 && body?.error?.code === 'VALIDATION_ERROR', `status=${status}`);
  } catch (e) {
    record('POST /chat empty message', false, e.message);
  }

  try {
    const { status, body } = await call('/api/v1/chat', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: '{invalid json',
    });
    record('POST /chat invalid JSON -> 400 INVALID_JSON', status === 400 && body?.error?.code === 'INVALID_JSON', `status=${status}`);
  } catch (e) {
    record('POST /chat invalid JSON', false, e.message);
  }

  try {
    const { status, body } = await call('/api/v1/chat', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'hi', provider: 'does-not-exist' }),
    });
    record('POST /chat unknown provider -> 400 UNKNOWN_PROVIDER', status === 400 && body?.error?.code === 'UNKNOWN_PROVIDER', `status=${status}`);
  } catch (e) {
    record('POST /chat unknown provider', false, e.message);
  }

  // 5. Unknown route
  try {
    const { status, body } = await call('/api/v1/does-not-exist', { headers: headers() });
    record('GET /api/v1/unknown -> 404 ROUTE_NOT_FOUND', status === 404 && body?.error?.code === 'ROUTE_NOT_FOUND', `status=${status}`);
  } catch (e) {
    record('GET /api/v1/unknown -> 404', false, e.message);
  }

  // 6. Optional real end-to-end chat call
  if (RUN_E2E) {
    try {
      const { status, body } = await call('/api/v1/chat', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: 'Reply with exactly: OK' }),
      });
      if (status === 200 && body?.success === true) {
        record('POST /chat (E2E) -> 200 with reply', true, `"${String(body.reply).slice(0, 60)}"`);
      } else if (status === 429 && body?.error?.code === 'UPSTREAM_RATE_LIMIT') {
        softWarnings += 1;
        record('POST /chat (E2E) -> upstream throttled', true, 'provider free tier busy (chain works)');
      } else {
        record('POST /chat (E2E)', false, `status=${status} code=${body?.error?.code}`);
      }
    } catch (e) {
      record('POST /chat (E2E)', false, e.message);
    }
  } else {
    console.log('SKIP  E2E chat call (set RUN_E2E=1 to enable)');
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\nResult: ${passed}/${results.length} passed${softWarnings ? ` (${softWarnings} soft warning)` : ''}${failed ? `, ${failed} FAILED` : ''}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
