/**
 * Local/dev Gemini key helpers.
 * Production keys live in Supabase `app_settings.gemini_api_key` (RLS-protected)
 * and are used only by the `gemini-analyze` Edge Function.
 *
 * Optional local fallback: `src/data/apiConfig.json` → geminiApiKeys[]
 * or `import.meta.env.VITE_GEMINI_API_KEY` (dev only — never commit real keys).
 */

import apiConfig from '../data/apiConfig.json';

const RATE_LIMIT_RETRY_DELAY_MS = 1500;
const KEY_BLOCK_DURATION_MS = 8 * 60 * 1000;

let activeKeyIndex = -1;
const blockedUntil = new Map<number, number>();

interface ApiConfig {
  geminiApiKeys?: string[];
}

export class AllKeysBlockedError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    super(
      `Toutes nos clés API sont temporairement surchargées. ` +
        `Veuillez réessayer dans environ ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    );
    this.name = 'AllKeysBlockedError';
    this.retryAfterMs = retryAfterMs;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  return keys
    .map((key) => key.trim())
    .filter((key) => {
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getRotatableKeys(): string[] {
  const config = apiConfig as ApiConfig;
  const fromFile = Array.isArray(config.geminiApiKeys) ? config.geminiApiKeys : [];
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
  const keys = [...fromFile, ...(fromEnv ? [fromEnv] : [])].filter(
    (key): key is string => typeof key === 'string',
  );
  return uniqueKeys(keys);
}

function pruneExpiredBlocks(): void {
  const now = Date.now();
  for (const [index, until] of blockedUntil.entries()) {
    if (until <= now) blockedUntil.delete(index);
  }
}

export function isKeyBlocked(index: number): boolean {
  pruneExpiredBlocks();
  const until = blockedUntil.get(index);
  return until !== undefined && until > Date.now();
}

export function markKeyBlocked(index: number, durationMs = KEY_BLOCK_DURATION_MS): void {
  blockedUntil.set(index, Date.now() + durationMs);
  console.warn(
    `[Gemini API] Local key index ${index} temporarily blocked for ${Math.round(durationMs / 60_000)} min (429/503).`,
  );
}

export function getAvailableKeyIndices(): number[] {
  const keys = getRotatableKeys();
  pruneExpiredBlocks();
  return keys.map((_, index) => index).filter((index) => !isKeyBlocked(index));
}

export function areAllKeysBlocked(): boolean {
  const keys = getRotatableKeys();
  if (keys.length === 0) return true;
  return getAvailableKeyIndices().length === 0;
}

export function getSoonestUnblockMs(): number {
  pruneExpiredBlocks();
  if (blockedUntil.size === 0) return 0;
  const now = Date.now();
  return Math.max(0, Math.min(...blockedUntil.values()) - now);
}

export function selectNextAvailableKeyIndex(fromIndex = activeKeyIndex): number | null {
  const keys = getRotatableKeys();
  const count = keys.length;
  if (count === 0) return null;

  pruneExpiredBlocks();

  for (let step = 0; step < count; step += 1) {
    const candidate = fromIndex < 0 ? step : (fromIndex + 1 + step) % count;
    if (!isKeyBlocked(candidate)) {
      activeKeyIndex = candidate;
      return candidate;
    }
  }

  return null;
}

function ensureActiveKeySelected(): number | null {
  const keys = getRotatableKeys();
  if (keys.length === 0) return null;

  if (activeKeyIndex >= 0 && activeKeyIndex < keys.length && !isKeyBlocked(activeKeyIndex)) {
    return activeKeyIndex;
  }

  return selectNextAvailableKeyIndex(activeKeyIndex);
}

/** Local/dev keys only — production uses Edge Function + Supabase. */
export function getApiKeys(): string[] {
  return getRotatableKeys();
}

export function hasApiKeys(): boolean {
  return getApiKeys().length > 0;
}

export function getApiKey(): string {
  const keys = getRotatableKeys();
  if (keys.length === 0) return '';
  const index = ensureActiveKeySelected();
  if (index === null) return '';
  return keys[index];
}

export function getApiKeyRotationIndex(): number {
  const keys = getRotatableKeys();
  if (keys.length === 0) return 0;
  const index = ensureActiveKeySelected();
  return index ?? (activeKeyIndex >= 0 ? activeKeyIndex % keys.length : 0);
}

export interface ApiKeyRotationStep {
  previousIndex: number;
  nextIndex: number;
  key: string;
}

export async function handleRetryAfterRateLimit(statusCode = 429): Promise<ApiKeyRotationStep | null> {
  const keys = getRotatableKeys();
  if (keys.length === 0) return null;

  const failedIndex = getApiKeyRotationIndex();
  markKeyBlocked(failedIndex);

  const nextIndex = selectNextAvailableKeyIndex(failedIndex);
  if (nextIndex === null) {
    console.warn(`[Gemini API] Rate limit (${statusCode}) — all local keys temporarily blocked.`);
    return null;
  }

  await delay(RATE_LIMIT_RETRY_DELAY_MS);

  return {
    previousIndex: failedIndex,
    nextIndex,
    key: keys[nextIndex],
  };
}

export function logCurrentApiKey(context?: string): void {
  const index = getApiKeyRotationIndex();
  const available = getAvailableKeyIndices().length;
  const total = getRotatableKeys().length;
  const suffix = context ? ` (${context})` : '';
  console.log(
    `[Gemini API] Using local key index: ${index}${suffix} — ${available}/${total} key(s) available`,
  );
}

export function getRotatableKeyCount(): number {
  return getRotatableKeys().length;
}

export function assertKeysAvailable(): void {
  if (areAllKeysBlocked()) {
    throw new AllKeysBlockedError(getSoonestUnblockMs());
  }
}
