/**
 * Build script for Cloudflare Pages (Build command: `npm run build`).
 *
 * Cloudflare Pages needs a static "Build output directory" (`out`):
 *   - public/*            -> out/   (landing page, _headers, favicon)
 *   - functions/*         -> bundled automatically by Pages (API endpoints)
 *
 * This script is intentionally dependency-free and CI-safe: pure Node fs
 * operations, no network, no prompts.
 */
import { rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(rootDir, 'public');
const outDir = join(rootDir, 'out');

function listFilesRecursively(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursively(full) : [full];
  });
}

try {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(publicDir, outDir, { recursive: true });

  const files = listFilesRecursively(outDir);
  const sizeBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);

  console.log('[build] AI Gateway API - static assets prepared.');
  console.log(`[build] Copied public/ -> out/ (${files.length} file(s), ${(sizeBytes / 1024).toFixed(1)} KB)`);
  for (const file of files) {
    console.log(`[build]   - ${relative(outDir, file)}`);
  }
  console.log('[build] API endpoints live under functions/ (bundled by Cloudflare Pages).');
  console.log('[build] Done.');
} catch (error) {
  console.error('[build] FAILED:', error.message);
  process.exit(1);
}
