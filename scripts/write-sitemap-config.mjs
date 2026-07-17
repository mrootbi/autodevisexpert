/**
 * Writes public/sitemap-config.php from .env for Hostinger deploys.
 *   node scripts/write-sitemap-config.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(ROOT, '.env');

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || '';
const key = env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const php = `<?php
return [
  'supabase_url' => ${JSON.stringify(url)},
  'supabase_anon_key' => ${JSON.stringify(key)},
  'site_base_url' => 'https://www.autodevisexpert.com',
];
`;

const out = join(ROOT, 'public', 'sitemap-config.php');
writeFileSync(out, php, 'utf8');
console.log(`Wrote ${out}`);
