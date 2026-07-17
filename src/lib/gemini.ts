import { VehicleInfo, InputMode, DevisResult, RepairLine } from './types';
import { analyzeDevis } from './engine';
import {
  AllKeysBlockedError,
  assertKeysAvailable,
  getApiKey,
  getApiKeys,
  getApiKeyRotationIndex,
  getAvailableKeyIndices,
  getRotatableKeyCount,
  getSoonestUnblockMs,
  handleRetryAfterRateLimit,
  hasApiKeys,
  isKeyBlocked,
  logCurrentApiKey,
  selectNextAvailableKeyIndex,
  areAllKeysBlocked,
} from './getApiKey';
import { geminiRequestQueue } from './requestQueue';
import { callGeminiAnalyzeEdge } from './adminGemini';
import {
  DEFAULT_AI_SYSTEM_PROMPT,
  normalizeAiSystemPrompt,
  readCachedAiSystemPrompt,
} from './aiPrompt';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/** Active models only (gemini-1.5-flash deprecated). Flash first = higher quota. */
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;

export {
  AllKeysBlockedError,
  areAllKeysBlocked,
  getApiKey,
  getApiKeys,
  hasApiKeys,
  getApiKeyRotationIndex,
  getRotatableKeyCount,
  logCurrentApiKey,
  handleRetryAfterRateLimit,
} from './getApiKey';

export function isAllKeysBlockedError(err: unknown): err is AllKeysBlockedError {
  return err instanceof AllKeysBlockedError;
}

/** @deprecated Prefer Edge Function + Supabase `gemini_api_key`. Local fallback only. */
export function getGeminiKey(): string {
  return getApiKey();
}

function isRateLimitStatus(status: number): boolean {
  return status === 429 || status === 503;
}

export interface GeminiDocument {
  base64: string;
  mimeType: string;
  fileName?: string;
}

export class GeminiConfigError extends Error {
  constructor() {
    super(
      'Erreur : configurez la clé API Gemini dans Admin → Intégrations (stockage Supabase sécurisé).',
    );
    this.name = 'GeminiConfigError';
  }
}

export class GeminiApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.statusCode = statusCode;
  }
}

export function isHighDemandError(err: unknown): boolean {
  if (!(err instanceof GeminiApiError)) return false;
  if (err.statusCode === 429 || err.statusCode === 503) {
    // Billing exhaustion is not a transient “high demand” case.
    const msg = err.message.toLowerCase();
    if (
      msg.includes('crédits') ||
      msg.includes('credits') ||
      msg.includes('billing') ||
      msg.includes('ai.studio') ||
      msg.includes('prepayment')
    ) {
      return false;
    }
    return true;
  }

  const msg = err.message.toLowerCase();
  return (
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('resource exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('quota') ||
    msg.includes('overloaded')
  );
}

export interface GeminiAnalysis {
  expertAdvice: {
    title: string;
    body: string;
    recommendation: string;
  };
  tableItems: RepairLine[];
}

/** Per-request user message (vehicle + source). System rules come from `ai_system_prompt`. */
function buildAnalysisUserPrompt(vehicle: VehicleInfo, userInput: string, hasDocument: boolean): string {
  const vehicleDetails = [
    vehicle.marque,
    vehicle.modele,
    vehicle.version,
    vehicle.moteur,
    vehicle.kilometrage ? `${vehicle.kilometrage} km` : '',
  ].filter(Boolean).join(' ');

  if (hasDocument) {
    return `Analyse le devis joint (document ou image) pour ce véhicule (${vehicleDetails}).${
      userInput.trim() ? ` Compléments fournis par l'utilisateur : ${userInput.trim()}` : ''
    }`;
  }

  return `Analyse ces symptômes ou ce devis pour ce véhicule (${vehicleDetails}) : ${userInput}`;
}

/** Local fallback prompt when Edge Function is unavailable. */
function resolveLocalSystemPrompt(): string {
  return normalizeAiSystemPrompt(readCachedAiSystemPrompt() ?? DEFAULT_AI_SYSTEM_PROMPT);
}

function extractJsonBlock(text: string): string {
  let t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t;
}

export function parseGeminiAnalysis(text: string): GeminiAnalysis | null {
  try {
    const parsed = JSON.parse(extractJsonBlock(text));
    if (!parsed || typeof parsed !== 'object') return null;

    const rawItems = Array.isArray(parsed.tableItems) ? parsed.tableItems : [];
    const tableItems: RepairLine[] = rawItems
      .map((item: Record<string, unknown>) => ({
        label: String(item?.label ?? '').trim(),
        prixGaragiste: Math.round(Number(item?.prixGaragiste) || 0),
        prixReel: Math.round(Number(item?.prixReel) || 0),
        detail: String(item?.detail ?? '').trim(),
      }))
      .filter((item: RepairLine) => item.label.length > 0);

    const advice = (parsed.expertAdvice ?? {}) as Record<string, unknown>;

    return {
      expertAdvice: {
        title: String(advice.title ?? '').trim(),
        body: String(advice.body ?? '').trim(),
        recommendation: String(advice.recommendation ?? '').trim(),
      },
      tableItems,
    };
  } catch {
    return null;
  }
}

async function requestGeminiModel(
  apiKey: string,
  model: string,
  body: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      let message = `Erreur ${res.status}`;
      try {
        const errBody = await res.json();
        message = errBody?.error?.message || message;
      } catch {
        // keep default message
      }
      return { ok: false, status: res.status, message };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return { ok: true, text };

    return { ok: false, status: 502, message: 'Réponse Gemini vide.' };
  } catch (err) {
    return { ok: false, status: 0, message: (err as Error).message };
  }
}

type KeyAttemptResult =
  | { outcome: 'success'; text: string; model: string }
  | { outcome: 'rate_limited'; error: GeminiApiError }
  | { outcome: 'hard_failure'; error: GeminiApiError };

/**
 * Try the full model fallback chain on one API key (Pro → Flash → legacy Flash).
 * Rate-limited models continue down the chain; non-retryable errors stop this key.
 */
async function attemptWithCurrentKey(apiKey: string, body: string): Promise<KeyAttemptResult> {
  let lastRateLimitError: GeminiApiError | null = null;
  let sawRateLimit = false;

  for (const model of MODEL_FALLBACK_CHAIN) {
    const result = await requestGeminiModel(apiKey, model, body);

    if (result.ok) {
      return { outcome: 'success', text: result.text, model };
    }

    const error = new GeminiApiError(result.message, result.status || undefined);

    if (isRateLimitStatus(result.status)) {
      sawRateLimit = true;
      lastRateLimitError = error;
      console.warn(`[Gemini API] ${model} rate-limited (${result.status}). Trying next model…`);
      continue;
    }

    // Model missing / unsupported → try next in chain (same as Edge failover).
    const msg = result.message.toLowerCase();
    if (result.status === 404 || msg.includes('not found') || msg.includes('not supported')) {
      console.warn(`[Gemini API] ${model} unavailable (${result.status}). Trying next model…`);
      continue;
    }

    console.error(`[Gemini API] Hard failure on ${model} (${result.status}).`);
    return { outcome: 'hard_failure', error };
  }

  if (sawRateLimit && lastRateLimitError) {
    return { outcome: 'rate_limited', error: lastRateLimitError };
  }

  return {
    outcome: 'hard_failure',
    error: lastRateLimitError ?? new GeminiApiError('Échec de tous les modèles Gemini.'),
  };
}

async function executeCallGeminiLocal(
  vehicle: VehicleInfo,
  userInput: string,
  document?: GeminiDocument,
): Promise<string> {
  const keyCount = getRotatableKeyCount();
  if (keyCount === 0) throw new GeminiConfigError();

  assertKeysAvailable();

  const systemPrompt = resolveLocalSystemPrompt();
  const userPrompt = buildAnalysisUserPrompt(vehicle, userInput, !!document);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userPrompt },
  ];

  if (document) {
    parts.push({
      inlineData: {
        mimeType: document.mimeType,
        data: document.base64,
      },
    });
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  let apiKey = getApiKey();
  if (!apiKey) {
    assertKeysAvailable();
    throw new GeminiConfigError();
  }

  const keysAttempted = new Set<number>();

  while (keysAttempted.size < keyCount) {
    assertKeysAvailable();

    const currentIndex = getApiKeyRotationIndex();

    if (isKeyBlocked(currentIndex)) {
      const nextIndex = selectNextAvailableKeyIndex(currentIndex);
      if (nextIndex === null) break;
      apiKey = getApiKey();
      continue;
    }

    if (keysAttempted.has(currentIndex)) {
      break;
    }

    keysAttempted.add(currentIndex);
    logCurrentApiKey(
      `local key ${keysAttempted.size}/${keyCount} — Flash → Pro fallback (${getAvailableKeyIndices().length} key(s) available)`,
    );

    const attempt = await attemptWithCurrentKey(apiKey, body);

    if (attempt.outcome === 'success') {
      console.log(
        `[Gemini API] Local success with key index ${getApiKeyRotationIndex()} (model: ${attempt.model})`,
      );
      return attempt.text;
    }

    if (attempt.outcome === 'hard_failure') {
      throw new AllKeysBlockedError(getSoonestUnblockMs());
    }

    const rotation = await handleRetryAfterRateLimit(attempt.error.statusCode ?? 429);
    if (!rotation) break;

    apiKey = rotation.key;
  }

  if (areAllKeysBlocked()) {
    throw new AllKeysBlockedError(getSoonestUnblockMs());
  }

  throw new AllKeysBlockedError(getSoonestUnblockMs());
}

async function executeCallGemini(
  vehicle: VehicleInfo,
  userInput: string,
  document?: GeminiDocument,
  mode?: InputMode,
): Promise<string> {
  // Production path: Edge Function reads gemini_api_key via service_role (never exposed to clients).
  try {
    const edge = await callGeminiAnalyzeEdge({
      vehicle: {
        marque: vehicle.marque,
        modele: vehicle.modele,
        version: vehicle.version,
        moteur: vehicle.moteur,
        kilometrage: vehicle.kilometrage,
      },
      userInput,
      mode,
      document: document
        ? { base64: document.base64, mimeType: document.mimeType, fileName: document.fileName }
        : undefined,
    });
    console.log(`[Gemini API] Edge success${edge.model ? ` (model: ${edge.model})` : ''}`);
    return edge.text;
  } catch (err) {
    const code = (err as { code?: string }).code;
    const status = (err as { statusCode?: number }).statusCode;
    const rawMessage = err instanceof Error ? err.message : '';
    const isNetworkFailure =
      status === 0 ||
      code === 'EDGE_UNREACHABLE' ||
      /failed to fetch|networkerror|load failed/i.test(rawMessage);

    // No key in DB → don't silently fall back unless local keys exist for dev.
    if (code === 'GEMINI_KEY_MISSING' && !hasApiKeys()) {
      throw new GeminiConfigError();
    }

    // Local key fallback is DEV-ONLY — never ship VITE_GEMINI_API_KEY to production bundles.
    if (
      import.meta.env.DEV &&
      hasApiKeys() &&
      (isNetworkFailure || status === 404 || status === 503 || code === 'GEMINI_KEY_MISSING')
    ) {
      console.warn('[Gemini API] Edge unavailable — falling back to local apiConfig / VITE_GEMINI_API_KEY (dev only)');
      return executeCallGeminiLocal(vehicle, userInput, document);
    }

    if (err instanceof GeminiConfigError || err instanceof AllKeysBlockedError) throw err;

    if (isNetworkFailure) {
      throw new GeminiApiError(
        'Impossible de joindre le service d’analyse Gemini. Réessayez dans un instant.',
        0,
      );
    }

    const message = rawMessage || 'Erreur Gemini';
    throw new GeminiApiError(message, status);
  }
}

/** Queued entry point — only one Gemini request runs at a time. */
export function callGemini(
  vehicle: VehicleInfo,
  userInput: string,
  document?: GeminiDocument,
  mode?: InputMode,
): Promise<string> {
  return geminiRequestQueue.enqueue(() => executeCallGemini(vehicle, userInput, document, mode));
}

export async function runAnalysis(
  vehicle: VehicleInfo,
  mode: InputMode,
  rawInput: string,
  quotedTotal?: number,
  document?: GeminiDocument,
): Promise<DevisResult> {
  const engineInput =
    rawInput.trim() ||
    (document?.fileName ? `Devis scanné : ${document.fileName}` : document ? 'Devis scanné (document joint)' : '');

  const fallback = analyzeDevis(vehicle, mode, engineInput, quotedTotal);
  const aiText = await callGemini(vehicle, rawInput, document, mode);
  const parsed = parseGeminiAnalysis(aiText);

  // Priorité absolue : tableau 100% dynamique à partir de la sortie de Gemini.
  if (parsed && parsed.tableItems.length > 0) {
    const tableItems = parsed.tableItems;
    const totalGaragiste = tableItems.reduce((s, item) => s + item.prixGaragiste, 0);
    const totalReel = tableItems.reduce((s, item) => s + item.prixReel, 0);

    return {
      vehicle,
      mode,
      rawInput: engineInput,
      tableItems,
      expertAdvice: {
        title: parsed.expertAdvice.title || "Avis de l'expert (IA)",
        body: parsed.expertAdvice.body || aiText,
        recommendation:
          parsed.expertAdvice.recommendation ||
          (document
            ? 'Analyse générée par Google Gemini à partir du document fourni.'
            : 'Analyse générée par Google Gemini à partir des éléments fournis.'),
        severity: 'info',
      },
      totalGaragiste,
      totalReel,
    };
  }

  // Repli si Gemini ne renvoie pas de JSON exploitable : on garde le moteur local
  // mais on injecte au mieux le texte de l'IA.
  fallback.expertAdvice = {
    title: parsed?.expertAdvice.title || "Avis de l'expert (IA)",
    body: parsed?.expertAdvice.body || aiText,
    recommendation:
      parsed?.expertAdvice.recommendation ||
      (document
        ? 'Analyse générée par Google Gemini à partir du document fourni.'
        : 'Analyse générée par Google Gemini à partir des éléments fournis.'),
    severity: 'info',
  };

  return fallback;
}
