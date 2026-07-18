import { canAccessGeminiSecrets } from './adminAuth';
import { supabase } from './supabase';

/** Exact row key in public.app_settings (not a `settings` table). */
const GEMINI_SETTING_KEY = 'gemini_api_key';

export { GEMINI_SETTING_KEY };

function functionsBase(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
}

/** Split a stored multi-key string into individual keys (comma-separated). */
export function parseGeminiKeysInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const k = part.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function countGeminiKeys(raw: string): number {
  return parseGeminiKeysInput(raw).length;
}

/** Empty OK (clears keys). Otherwise every segment must look like a real key. */
export function isValidGeminiKeysInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const keys = parseGeminiKeysInput(trimmed);
  if (keys.length === 0) return false;
  return keys.every((k) => k.length >= 20);
}

/** Serialize keys for DB — join non-empty trimmed values with commas. */
export function serializeGeminiKeys(keys: string[]): string {
  return keys.map((k) => k.trim()).filter(Boolean).join(',');
}

export function normalizeGeminiKeysForSave(raw: string): string {
  return raw.trim();
}

export interface GeminiKeyAdminState {
  configured: boolean;
  geminiApiKey: string;
  preview: string;
  keyCount: number;
  source?: 'table' | 'edge';
}

function toState(geminiApiKey: string, source?: 'table' | 'edge'): GeminiKeyAdminState {
  const trimmed = geminiApiKey.trim();
  return {
    configured: trimmed.length > 0,
    geminiApiKey: trimmed,
    preview: trimmed ? `…${trimmed.replace(/\s/g, '').slice(-4)}` : '',
    keyCount: countGeminiKeys(trimmed),
    source,
  };
}

/**
 * Direct read from app_settings — bypasses stuck PostgREST RPC schema cache.
 * Requires RLS policies that allow SELECT on key = 'gemini_api_key'.
 */
async function fetchViaTable(): Promise<GeminiKeyAdminState> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', GEMINI_SETTING_KEY)
    .maybeSingle();

  if (error) {
    if (/row-level security|rls|42501|permission/i.test(error.message)) {
      throw new Error(
        'RLS bloque la lecture de gemini_api_key. Exécutez la migration SQL « allow gemini_api_key table access » dans Supabase.',
      );
    }
    throw new Error(error.message || 'Impossible de charger la clé Gemini.');
  }

  return toState(String(data?.value ?? ''), 'table');
}

/**
 * Direct upsert into app_settings — no RPC.
 * Payload matches the table: key / value / updated_at.
 */
async function saveViaTable(cleaned: string): Promise<GeminiKeyAdminState> {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: GEMINI_SETTING_KEY,
        value: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    .select('value')
    .maybeSingle();

  if (error) {
    if (/row-level security|rls|42501|permission/i.test(error.message)) {
      throw new Error(
        'RLS bloque l’écriture de gemini_api_key. Exécutez la migration SQL « allow gemini_api_key table access » dans Supabase.',
      );
    }
    throw new Error(error.message || 'Échec de l’enregistrement de la clé Gemini.');
  }

  return toState(String(data?.value ?? cleaned), 'table');
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = anonKey();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  return fetch(`${functionsBase()}${path}`, { ...init, headers });
}

/** Optional Edge path for public analysis only (keys stay server-side when Edge is deployed). */
export async function callGeminiAnalyzeEdge(payload: {
  vehicle?: Record<string, string | undefined>;
  userInput: string;
  mode?: string;
  document?: { base64: string; mimeType: string; fileName?: string };
}): Promise<{ text: string; model?: string }> {
  const key = anonKey();
  const base = functionsBase();
  if (!base || base === '/functions/v1' || !key) {
    const err = new Error(
      'Configuration Supabase manquante (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 0;
    err.code = 'EDGE_UNREACHABLE';
    throw err;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/gemini-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    const err = new Error(
      networkErr instanceof Error ? networkErr.message : 'Failed to fetch',
    ) as Error & { statusCode?: number; code?: string };
    // status 0 → gemini.ts treats Edge as unreachable and can fall back locally
    err.statusCode = 0;
    err.code = 'EDGE_UNREACHABLE';
    throw err;
  }

  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    model?: string;
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.text) {
    const err = new Error(data.error || `Erreur analyse Gemini (${res.status})`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = res.status;
    err.code = data.code;
    throw err;
  }

  return { text: data.text, model: data.model };
}

/** Load Gemini API key(s) via direct app_settings select (admin UI gate only). */
export async function fetchGeminiApiKeyAdmin(): Promise<GeminiKeyAdminState> {
  const empty = toState('');
  if (!canAccessGeminiSecrets()) return empty;
  return fetchViaTable();
}

/** Persist gemini_api_key via direct app_settings upsert (bypasses RPC schema cache). */
export async function saveGeminiApiKeyAdmin(geminiApiKey: string): Promise<GeminiKeyAdminState> {
  if (!canAccessGeminiSecrets()) {
    throw new Error('Session admin absente — reconnectez-vous pour enregistrer les clés.');
  }

  const cleaned = normalizeGeminiKeysForSave(geminiApiKey);
  if (!isValidGeminiKeysInput(cleaned)) {
    throw new Error('Format invalide : chaque clé doit faire au moins 20 caractères.');
  }

  return saveViaTable(cleaned);
}

/** @deprecated Kept for call sites that still import Edge helpers — unused by admin save. */
export async function pingGeminiEdge(): Promise<boolean> {
  try {
    const res = await adminFetch('/gemini-analyze', { method: 'OPTIONS' });
    return res.ok;
  } catch {
    return false;
  }
}
