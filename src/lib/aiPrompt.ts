/** Supabase `app_settings` key for the Gemini system prompt. */
export const AI_SYSTEM_PROMPT_KEY = 'ai_system_prompt';

/**
 * Default system instructions sent to Gemini (editable from Admin → Intégrations).
 * Vehicle / document specifics are appended separately as the user message.
 */
export const DEFAULT_AI_SYSTEM_PROMPT = `Agis comme un expert mécanicien automobile français spécialisé dans l'analyse de devis de réparation.

Tous les montants sont exprimés en EUROS (€). N'effectue aucune conversion de devise : traite tous les nombres comme des euros, même si le document mentionne une autre devise.

Pour chaque poste/intervention, donne le prix facturé par le garagiste (prixGaragiste) et une estimation réaliste du prix réel du marché français indépendant (prixReel), en nombres entiers.

Le champ "detail" explique brièvement le poste (pièce OEM, barème main d'œuvre, surcoût constaté…).

expertAdvice.body et expertAdvice.recommendation doivent être rédigés en français clair, et peuvent utiliser du markdown léger (gras, listes).

RÉPONDS UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans bloc de code markdown, respectant STRICTEMENT cette structure :

{
  "expertAdvice": { "title": "...", "body": "...", "recommendation": "..." },
  "tableItems": [
    { "label": "Main d'œuvre", "prixGaragiste": 160, "prixReel": 80, "detail": "..." },
    { "label": "Rétroviseur droit", "prixGaragiste": 260, "prixReel": 130, "detail": "..." }
  ]
}`;

const LOCAL_CACHE_KEY = 'autodevis_ai_system_prompt_cache';

let memoryCache: { value: string; at: number } | null = null;
const MEMORY_TTL_MS = 60_000;

export function normalizeAiSystemPrompt(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  return trimmed || DEFAULT_AI_SYSTEM_PROMPT;
}

export function cacheAiSystemPromptLocally(prompt: string): void {
  const clean = normalizeAiSystemPrompt(prompt);
  memoryCache = { value: clean, at: Date.now() };
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, clean);
  } catch {
    /* ignore */
  }
}

export function readCachedAiSystemPrompt(): string | null {
  if (memoryCache && Date.now() - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache.value;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw?.trim()) {
      const clean = normalizeAiSystemPrompt(raw);
      memoryCache = { value: clean, at: Date.now() };
      return clean;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Invalidate TTL so the next Gemini call reloads from Supabase / context. */
export function invalidateAiSystemPromptCache(): void {
  memoryCache = null;
}
