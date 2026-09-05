/**
 * GET /health and GET /api/v1/health
 * Liveness probe for uptime monitors, load balancers, Cloudflare health checks.
 */
import { APP_VERSION } from '../config.js';

export function healthCheck(c) {
  const cfg = c.get('config');
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    defaultProvider: cfg.defaultProvider,
  });
}
