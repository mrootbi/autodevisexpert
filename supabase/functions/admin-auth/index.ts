/**
 * Admin login — verifies against app_settings (admin_panel_username / admin_panel_password)
 * via service_role, then issues a signed token.
 *
 * Optional secrets (override DB only if you intentionally freeze Edge credentials):
 *   ADMIN_JWT_SECRET
 *
 * Deploy: supabase functions deploy admin-auth --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-admin-password',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Brute-force protection — per-IP sliding window (in-memory, per isolate). */
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_ATTEMPTS = 8;
const rateBuckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  return cf || realIp || forwarded || 'unknown';
}

function allowAttempt(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const inWindow = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (inWindow.length >= RATE_MAX_ATTEMPTS) {
    rateBuckets.set(ip, inWindow);
    return false;
  }
  inWindow.push(now);
  rateBuckets.set(ip, inWindow);
  if (rateBuckets.size > 5_000) {
    for (const [key, bucket] of rateBuckets) {
      const kept = bucket.filter((t) => now - t < RATE_WINDOW_MS);
      if (kept.length === 0) rateBuckets.delete(key);
      else rateBuckets.set(key, kept);
    }
  }
  return true;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const ip = clientIp(req);
  if (!allowAttempt(ip)) {
    return json(429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }

  const jwtSecret = Deno.env.get('ADMIN_JWT_SECRET') || 'local-dev-jwt-secret-change-me';

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!username || !password) {
    return json(401, { error: 'Identifiants invalides' });
  }

  const supabase = serviceClient();
  const { data: rows, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['admin_panel_username', 'admin_panel_password']);

  if (error) {
    return json(500, { error: error.message });
  }

  const map: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row?.key) map[row.key] = String(row.value ?? '');
  }

  const expectedUser = (map.admin_panel_username || 'admin').trim() || 'admin';
  const expectedPass = map.admin_panel_password || '';

  // No password configured in the DB yet → deny rather than accept a guessable default.
  if (!expectedPass || username !== expectedUser || password !== expectedPass) {
    return json(401, { error: 'Identifiants invalides' });
  }

  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000, sub: username });
  const sig = await hmacSign(jwtSecret, payload);
  const token = `${btoa(payload)}.${sig}`;

  return json(200, {
    token,
    expiresInHours: 8,
    username: expectedUser,
  });
});
