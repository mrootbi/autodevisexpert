/**
 * Read/update gemini_api_key via service_role (RLS blocks anon).
 * Auth: signed admin token (x-admin-token) OR admin password (x-admin-password).
 *
 * Deploy: supabase functions deploy admin-gemini-key --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const GEMINI_KEY = 'gemini_api_key';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-admin-password',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

/** Brute-force protection — per-IP sliding window (in-memory, per isolate). */
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_ATTEMPTS = 15;
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

function jwtSecret(): string {
  return Deno.env.get('ADMIN_JWT_SECRET') || 'local-dev-jwt-secret-change-me';
}

async function verifyAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const secret = jwtSecret();
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  try {
    const payload = atob(payloadB64);
    const expected = await hmacSign(secret, payload);
    if (expected !== sig) return false;
    const data = JSON.parse(payload) as { role?: string; exp?: number };
    return data.role === 'admin' && !!data.exp && Date.now() <= data.exp;
  } catch {
    return false;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.get('x-admin-token') || '';
  return header.trim() || null;
}

function extractPassword(req: Request): string | null {
  const header = req.headers.get('x-admin-password') || '';
  return header.trim() || null;
}

function expectedAdminPasswordFromEnv(): string {
  return Deno.env.get('ADMIN_PASSWORD') || '';
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorize(req: Request): Promise<boolean> {
  if (await verifyAdminToken(extractToken(req))) return true;

  const password = extractPassword(req);
  if (!password) return false;

  const envPass = expectedAdminPasswordFromEnv();
  if (envPass && password === envPass) return true;

  try {
    const supabase = serviceClient();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_panel_password')
      .maybeSingle();
    const dbPass = String(data?.value ?? '');
    // No password configured / reachable → deny rather than accept a guessable default.
    if (dbPass && password === dbPass) return true;
  } catch {
    return false;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = clientIp(req);
  if (!allowAttempt(ip)) {
    return json(429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }

  if (!(await authorize(req))) {
    return json(401, { error: 'Admin non authentifié' });
  }

  const supabase = serviceClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', GEMINI_KEY)
      .maybeSingle();

    if (error) return json(500, { error: error.message });

    const value = String(data?.value ?? '');
    const trimmed = value.trim();
    const keyCount = trimmed
      ? trimmed.split(',').map((p) => p.trim()).filter(Boolean).length
      : 0;

    return json(200, {
      configured: trimmed.length > 0,
      geminiApiKey: trimmed,
      preview: trimmed ? `…${trimmed.replace(/\s/g, '').slice(-4)}` : '',
      keyCount,
    });
  }

  if (req.method === 'PUT') {
    let body: { geminiApiKey?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const geminiApiKey = String(body.geminiApiKey ?? '').trim();
    const parts = geminiApiKey
      ? geminiApiKey.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    if (geminiApiKey && parts.length === 0) {
      return json(400, { error: 'Aucune clé valide détectée' });
    }

    for (const part of parts) {
      if (part.length < 20) {
        return json(400, {
          error: `Chaque clé doit faire au moins 20 caractères (problème sur : « ${part.slice(0, 8)}… »)`,
        });
      }
    }

    const { error } = await supabase.from('app_settings').upsert(
      {
        key: GEMINI_KEY,
        value: geminiApiKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

    if (error) return json(500, { error: error.message });

    return json(200, {
      configured: geminiApiKey.length > 0,
      preview: geminiApiKey ? `…${geminiApiKey.replace(/\s/g, '').slice(-4)}` : '',
      keyCount: parts.length,
      geminiApiKey,
    });
  }

  return json(405, { error: 'Method not allowed' });
});
