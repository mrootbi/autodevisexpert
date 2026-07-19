import { canAccessGeminiSecrets, getAdminPassword, getAdminToken } from './adminAuth';

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
 * `gemini_api_key` is a secret row — RLS denies anon table access to it by design.
 * Reads/writes go through the password/token-gated `admin-gemini-key` Edge
 * Function (service_role), never a direct client-side table query.
 */
function adminSecretHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey(),
    Authorization: `Bearer ${anonKey()}`,
  };
  const token = getAdminToken();
  const password = getAdminPassword();
  if (token) headers['x-admin-token'] = token;
  else if (password) headers['x-admin-password'] = password;
  return headers;
}

async function readEdgeError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

async function fetchViaEdge(): Promise<GeminiKeyAdminState> {
  const res = await fetch(`${functionsBase()}/admin-gemini-key`, {
    method: 'GET',
    headers: adminSecretHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readEdgeError(res, 'Impossible de charger la clé Gemini.'));
  }

  const data = (await res.json()) as { geminiApiKey?: string };
  return toState(String(data.geminiApiKey ?? ''), 'edge');
}

async function saveViaEdge(cleaned: string): Promise<GeminiKeyAdminState> {
  const res = await fetch(`${functionsBase()}/admin-gemini-key`, {
    method: 'PUT',
    headers: adminSecretHeaders(),
    body: JSON.stringify({ geminiApiKey: cleaned }),
  });

  if (!res.ok) {
    throw new Error(await readEdgeError(res, 'Échec de l’enregistrement de la clé Gemini.'));
  }

  const data = (await res.json()) as { geminiApiKey?: string };
  return toState(String(data.geminiApiKey ?? cleaned), 'edge');
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

/** Load Gemini API key(s) via the password-gated Edge Function (admin UI gate only). */
export async function fetchGeminiApiKeyAdmin(): Promise<GeminiKeyAdminState> {
  const empty = toState('');
  if (!canAccessGeminiSecrets()) return empty;
  return fetchViaEdge();
}

/** Persist gemini_api_key via the password-gated Edge Function (service_role). */
export async function saveGeminiApiKeyAdmin(geminiApiKey: string): Promise<GeminiKeyAdminState> {
  if (!canAccessGeminiSecrets()) {
    throw new Error('Session admin absente — reconnectez-vous pour enregistrer les clés.');
  }

  const cleaned = normalizeGeminiKeysForSave(geminiApiKey);
  if (!isValidGeminiKeysInput(cleaned)) {
    throw new Error('Format invalide : chaque clé doit faire au moins 20 caractères.');
  }

  return saveViaEdge(cleaned);
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
