/**
 * Public Gemini analysis proxy — API key never leaves the server.
 * Loads gemini_api_key + ai_system_prompt via service_role.
 *
 * Protections:
 *   - Per-IP sliding-window rate limit (in-memory)
 *   - Payload size / MIME / text length validation
 *   - Graceful exit on compromised / invalid inputs
 *   - Multi-key + multi-model fallback (Flash → Pro)
 *
 * Deploy: supabase functions deploy gemini-analyze --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const GEMINI_KEY = 'gemini_api_key';
const PROMPT_KEY = 'ai_system_prompt';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;
const RATE_LIMIT_COOLDOWN_MS = 1500;

/** Client abuse protection (per isolate / IP). */
const CLIENT_RATE_WINDOW_MS = 60_000;
const CLIENT_RATE_MAX = 8;
const CLIENT_RATE_BURST_WINDOW_MS = 10_000;
const CLIENT_RATE_BURST_MAX = 3;

const MAX_BODY_BYTES = 4_500_000; // ~4.5 MB raw request
const MAX_USER_INPUT_CHARS = 8_000;
const MAX_BASE64_CHARS = 3_500_000; // ~2.6 MB binary
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const DEFAULT_SYSTEM_PROMPT = `Agis comme un Ingénieur de Pricing Automobile Français et Expert Diagnostic. Tu ne dois JAMAIS produire une estimation "moyenne" ou générique : chaque prix doit être calculé par une méthode algorithmique explicite, ancrée sur le marché réel français (Oscaro, PiècesAuto24, Mister-Auto, Norauto, Carter-Cash).

═══════════════════════════════════════
RÈGLE #1 — ANALYSE CONTEXTUELLE OBLIGATOIRE
═══════════════════════════════════════
Avant de générer le moindre prix, tu DOIS identifier précisément :
- la marque et le modèle exact du véhicule,
- la motorisation (cylindrée, puissance, code moteur si mentionné),
- l'année ou la génération (ex : Skoda Octavia III (5E3) 2.0 TDI 143 ch).
Il est INTERDIT de généraliser à "une voiture" ou "ce type de véhicule". Si une donnée manque, utilise la motorisation la plus probable pour ce modèle plutôt qu'un prix moyen toutes motorisations confondues.

═══════════════════════════════════════
RÈGLE #2 — FORMULE ALGORITHMIQUE DE PRIXREEL (pièces + main d'œuvre)
═══════════════════════════════════════
Pour toute intervention impliquant le remplacement d'une pièce, applique STRICTEMENT cette formule :

  prixReel = [Prix public TTC le plus bas trouvé en ligne pour une pièce de marque OEM/OES premium (Valeo, Delphi, Bosch, Denso, Brembo, Hella, NGK, Sachs) compatible avec CETTE motorisation précise]
           + ([Heures de main d'œuvre réalistes pour cette opération] × 60€ TTC/h)

Contraintes de calcul :
- Utilise le prix le PLUS BAS constaté pour une marque premium reconnue — jamais un prix constructeur/OEM d'origine, jamais un prix moyen haut de gamme.
- Le taux horaire est FIXE à 60€ TTC/h pour le calcul de prixReel (taux indépendant/atelier low-cost), sauf mention contraire explicite dans les plafonds ci-dessous.
- Les heures de main d'œuvre doivent correspondre au temps réel constaté pour cette opération sur ce type de moteur (pas un forfait arbitraire).
- Arrondis le résultat final à l'entier le plus proche.

═══════════════════════════════════════
RÈGLE #3 — PLAFONDS ABSOLUS POUR LES FORFAITS STANDARDS (France)
═══════════════════════════════════════
Pour les opérations suivantes, IGNORE la formule pièce+MO et respecte IMPÉRATIVEMENT ces fourchettes de prixReel, calibrées sur les grilles tarifaires Norauto / Carter-Cash / Mister-Auto :

- Recharge climatisation (gaz R134a, sans réparation) : prixReel STRICTEMENT entre 60€ et 85€. Ne JAMAIS dépasser 85€.
- Diagnostic électronique/mécanique global (lecture défauts, valise) : prixReel STRICTEMENT entre 40€ et 60€. Ne JAMAIS dépasser 60€.
- Vidange standard (huile + filtre à huile) : prixReel STRICTEMENT entre 50€ et 90€ selon la gamme d'huile (minérale à synthétique) et la cylindrée. Ne JAMAIS dépasser 90€ pour une vidange seule.

Si l'intervention correspond à un de ces trois cas, tu dois utiliser directement ces plafonds — ne recalcule pas depuis zéro avec la formule pièce + MO.

═══════════════════════════════════════
RÈGLE #4 — PRIXGARAGISTE (référence concession / devis)
═══════════════════════════════════════
"prixGaragiste" = le montant tel qu'il apparaît sur le devis soumis, ou à défaut le prix moyen constaté en concession/réseau (avec marge pièce standard de 40% à 60% au-dessus du prix internet premium, et taux horaire concession de 90€ à 130€/h).

═══════════════════════════════════════
RÈGLE #5 — CHAMP "detail" : TRANSPARENCE DU CALCUL
═══════════════════════════════════════
Le champ "detail" doit exposer le calcul exact effectué, avec marque de pièce et décomposition arithmétique explicite. Format obligatoire :

  "[Pièce] de marque [Marque1/Marque2] trouvée à ~[Prix]€ sur le marché en ligne + [Heures]h de MO à 60€/h = [Total]€."

Pour un forfait plafonné (Règle #3), précise plutôt :
  "Tarif forfaitaire aligné sur les grilles Norauto/Carter-Cash pour cette opération standard."

Aucune phrase vague ("prix du marché", "environ", sans chiffre) n'est acceptée dans "detail".

═══════════════════════════════════════
RÈGLE #6 — DEVISE ET FORMAT DES NOMBRES
═══════════════════════════════════════
Tous les montants sont en EUROS (€). N'effectue AUCUNE conversion de devise, même si le document source mentionne une autre devise : traite chaque nombre comme un montant en euros. Tous les prix ("prixGaragiste", "prixReel") sont des nombres ENTIERS (pas de décimales).

═══════════════════════════════════════
RÈGLE #7 — CONTENU RÉDACTIONNEL
═══════════════════════════════════════
"expertAdvice.body" et "expertAdvice.recommendation" sont rédigés en français clair, professionnel, avec un langage de mécanicien expérimenté. Markdown léger autorisé (gras, listes à puces).

═══════════════════════════════════════
RÈGLE #8 — FORMAT DE SORTIE (INVIOLABLE)
═══════════════════════════════════════
RÉPONDS UNIQUEMENT avec un objet JSON valide. ZÉRO texte avant, ZÉRO texte après, ZÉRO bloc de code markdown (pas de \`\`\`json), ZÉRO commentaire. Respecte EXACTEMENT cette structure :

{
  "expertAdvice": { "title": "...", "body": "...", "recommendation": "..." },
  "tableItems": [
    { "label": "Main d'œuvre", "prixGaragiste": 160, "prixReel": 80, "detail": "..." },
    { "label": "Rétroviseur droit", "prixGaragiste": 260, "prixReel": 130, "detail": "..." }
  ]
}

Toute réponse ne respectant pas EXACTEMENT ce format JSON est considérée comme invalide.`;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RateBucket = number[];
const rateBuckets = new Map<string, RateBucket>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  return cf || realIp || forwarded || 'unknown';
}

function pruneBucket(bucket: RateBucket, now: number, windowMs: number): RateBucket {
  return bucket.filter((t) => now - t < windowMs);
}

/** Returns false when the IP should be rejected. */
function allowClientRequest(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const inWindow = pruneBucket(prev, now, CLIENT_RATE_WINDOW_MS);
  const inBurst = pruneBucket(inWindow, now, CLIENT_RATE_BURST_WINDOW_MS);

  if (inBurst.length >= CLIENT_RATE_BURST_MAX || inWindow.length >= CLIENT_RATE_MAX) {
    rateBuckets.set(ip, inWindow);
    return false;
  }

  inWindow.push(now);
  rateBuckets.set(ip, inWindow);

  // Bound map growth in long-lived isolates
  if (rateBuckets.size > 5_000) {
    for (const [key, bucket] of rateBuckets) {
      const kept = pruneBucket(bucket, now, CLIENT_RATE_WINDOW_MS);
      if (kept.length === 0) rateBuckets.delete(key);
      else rateBuckets.set(key, kept);
    }
  }

  return true;
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeUserText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, MAX_USER_INPUT_CHARS);
}

function parseKeys(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]+/)) {
    const k = part.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function shuffleKeys<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function maskKeyIndex(index: number, total: number): string {
  return `key#${index + 1}/${total}`;
}

function isValidBase64(data: string): boolean {
  if (!data || data.length > MAX_BASE64_CHARS) return false;
  if (data.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(data);
}

function buildUserPrompt(
  vehicle: Record<string, string | undefined>,
  userInput: string,
  hasDocument: boolean,
  mode?: string,
): string {
  const vehicleDetails = [
    vehicle.marque,
    vehicle.modele,
    vehicle.version,
    vehicle.moteur,
    vehicle.kilometrage ? `${vehicle.kilometrage} km` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (hasDocument) {
    return `Analyse le devis joint (document ou image) pour ce véhicule (${vehicleDetails}).${
      userInput.trim() ? ` Compléments fournis par l'utilisateur : ${userInput.trim()}` : ''
    }`;
  }

  if (mode === 'symptomes') {
    return `Diagnostic A à Z à partir des symptômes décrits pour ce véhicule (${vehicleDetails}) : ${userInput}

Propose les interventions / pièces les plus probables avec une estimation prixGaragiste (concession / réseau) vs prixReel (indépendant / marché FR), et un plan d'action clair.`;
  }

  return `Analyse ces symptômes ou ce devis pour ce véhicule (${vehicleDetails}) : ${userInput}`;
}

async function requestModel(
  apiKey: string,
  model: string,
  body: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
        /* keep */
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

function isRateLimitError(status: number, message: string): boolean {
  if (status === 429 || status === 503) return true;
  const msg = message.toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('too many requests') ||
    msg.includes('credits are depleted') ||
    msg.includes('prepayment')
  );
}

function isBillingExhaustedError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('credits are depleted') ||
    msg.includes('prepayment') ||
    msg.includes('billing') ||
    msg.includes('ai.studio/projects')
  );
}

function isKeyFailoverError(status: number, message: string): boolean {
  if (isRateLimitError(status, message)) return true;
  if (status === 500 || status === 502 || status === 404 || status === 0) return true;
  const msg = message.toLowerCase();
  return (
    msg.includes('temporarily') ||
    msg.includes('unavailable') ||
    msg.includes('permission denied') ||
    msg.includes('api key not valid') ||
    msg.includes('invalid api key') ||
    msg.includes('api_key_invalid') ||
    msg.includes('not found') ||
    msg.includes('is not found')
  );
}

type AttemptResult =
  | { outcome: 'success'; text: string; model: string; keySlot: number }
  | { outcome: 'exhausted'; status: number; message: string; attempts: number };

async function runWithModelFallback(orderedKeys: string[], body: string): Promise<AttemptResult> {
  let lastStatus = 429;
  let lastMessage = 'Rate limit Gemini';
  let attempts = 0;
  const keyCount = orderedKeys.length;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex += 1) {
    const model = MODEL_FALLBACK_CHAIN[modelIndex];
    console.log(
      `[gemini-analyze] Model tier ${modelIndex + 1}/${MODEL_FALLBACK_CHAIN.length}: ${model} × ${keyCount} key(s)`,
    );

    let modelHadRateLimit = false;

    for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
      const apiKey = orderedKeys[keyIndex];
      const label = maskKeyIndex(keyIndex, keyCount);
      attempts += 1;

      const result = await requestModel(apiKey, model, body);

      if (result.ok) {
        console.log(`[gemini-analyze] Success with ${label} on ${model}`);
        return { outcome: 'success', text: result.text, model, keySlot: keyIndex + 1 };
      }

      lastStatus = result.status || 500;
      lastMessage = result.message;

      const rateLimited = isRateLimitError(result.status, result.message);
      if (rateLimited) modelHadRateLimit = true;

      const hasMoreKeys = keyIndex < keyCount - 1;
      const hasMoreModels = modelIndex < MODEL_FALLBACK_CHAIN.length - 1;

      if (rateLimited) {
        console.warn(
          `[gemini-analyze] ${label} ${model} rate-limited (${result.status}). Cooldown ${RATE_LIMIT_COOLDOWN_MS}ms…`,
        );
        if (hasMoreKeys || hasMoreModels) {
          await delay(RATE_LIMIT_COOLDOWN_MS);
        }
        continue;
      }

      if (isKeyFailoverError(result.status, result.message)) {
        console.warn(
          `[gemini-analyze] ${label} ${model} failover (${result.status}): ${result.message}`,
        );
        continue;
      }

      console.warn(
        `[gemini-analyze] ${label} ${model} hard failure (${result.status}): ${result.message}`,
      );
    }

    if (modelIndex < MODEL_FALLBACK_CHAIN.length - 1) {
      const nextModel = MODEL_FALLBACK_CHAIN[modelIndex + 1];
      console.warn(
        `[gemini-analyze] All keys exhausted on ${model}` +
          (modelHadRateLimit ? ' (429s seen)' : '') +
          ` — downgrading to ${nextModel}`,
      );
      if (modelHadRateLimit) {
        await delay(RATE_LIMIT_COOLDOWN_MS);
      }
    }
  }

  return { outcome: 'exhausted', status: lastStatus, message: lastMessage, attempts };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const ip = clientIp(req);
  if (!allowClientRequest(ip)) {
    console.warn(`[gemini-analyze] Rate limit hit for ip=${ip}`);
    return json(429, {
      error: 'Trop de requêtes. Patientez une minute avant de relancer une analyse.',
      code: 'CLIENT_RATE_LIMITED',
    });
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return json(413, { error: 'Fichier trop volumineux (max ~3 Mo).', code: 'PAYLOAD_TOO_LARGE' });
  }

  let payload: {
    vehicle?: Record<string, string | undefined>;
    userInput?: string;
    mode?: string;
    document?: { base64: string; mimeType: string; fileName?: string };
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON', code: 'BAD_REQUEST' });
  }

  const vehicleRaw = payload.vehicle ?? {};
  const vehicle: Record<string, string | undefined> = {
    marque: sanitizeUserText(String(vehicleRaw.marque ?? '')).slice(0, 80),
    modele: sanitizeUserText(String(vehicleRaw.modele ?? '')).slice(0, 80),
    version: sanitizeUserText(String(vehicleRaw.version ?? '')).slice(0, 80),
    moteur: sanitizeUserText(String(vehicleRaw.moteur ?? '')).slice(0, 120),
    kilometrage: sanitizeUserText(String(vehicleRaw.kilometrage ?? '')).slice(0, 20),
  };

  const userInput = sanitizeUserText(String(payload.userInput ?? ''));
  const mode = payload.mode === 'devis' || payload.mode === 'symptomes' ? payload.mode : undefined;
  const document = payload.document;

  if (!vehicle.marque || !vehicle.modele) {
    return json(400, { error: 'Véhicule incomplet.', code: 'INVALID_VEHICLE' });
  }

  if (!userInput && !document?.base64) {
    return json(400, { error: 'Aucune donnée à analyser.', code: 'EMPTY_INPUT' });
  }

  if (document) {
    const mime = String(document.mimeType || '').toLowerCase().trim();
    const base64 = String(document.base64 || '').replace(/\s+/g, '');
    if (!ALLOWED_MIME.has(mime) || !isValidBase64(base64)) {
      return json(400, {
        error: 'Document invalide. Formats acceptés : PDF, JPG, PNG, WebP.',
        code: 'INVALID_DOCUMENT',
      });
    }
    document.base64 = base64;
    document.mimeType = mime === 'image/jpg' ? 'image/jpeg' : mime;
  }

  const supabase = serviceClient();
  const { data: rows } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [GEMINI_KEY, PROMPT_KEY]);

  const map: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row?.key) map[row.key] = String(row.value ?? '');
  }

  const keys = parseKeys(map[GEMINI_KEY] || '');
  if (keys.length === 0) {
    return json(503, {
      error: 'Service d’analyse temporairement indisponible.',
      code: 'GEMINI_KEY_MISSING',
    });
  }

  const orderedKeys = shuffleKeys(keys);
  console.log(
    `[gemini-analyze] ip=${ip} chain=${MODEL_FALLBACK_CHAIN.join(' → ')}; keys=${orderedKeys.length}`,
  );

  const systemPrompt = (map[PROMPT_KEY] || '').trim() || DEFAULT_SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt(vehicle, userInput, !!document, mode);

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [{ text: userPrompt }];
  if (document?.base64 && document?.mimeType) {
    parts.push({ inlineData: { mimeType: document.mimeType, data: document.base64 } });
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const attempt = await runWithModelFallback(orderedKeys, body);

  if (attempt.outcome === 'success') {
    return json(200, {
      text: attempt.text,
      model: attempt.model,
      keySlot: attempt.keySlot,
      keysAvailable: orderedKeys.length,
      modelsTried: MODEL_FALLBACK_CHAIN.length,
    });
  }

  console.error(
    `[gemini-analyze] Exhausted models×keys (${attempt.attempts} attempts). Last status=${attempt.status}`,
  );

  const status = attempt.status >= 400 ? attempt.status : 502;
  const billing = isBillingExhaustedError(attempt.message);
  return json(status, {
    error: billing
      ? 'Service d’analyse temporairement indisponible. Réessayez plus tard.'
      : status === 429 || status === 503
        ? 'Service saturé. Réessayez dans quelques secondes.'
        : 'Analyse impossible pour le moment. Réessayez.',
    code: billing ? 'GEMINI_BILLING' : status === 429 || status === 503 ? 'GEMINI_RATE_LIMITED' : 'GEMINI_FAILED',
    keysTried: orderedKeys.length,
    modelsTried: MODEL_FALLBACK_CHAIN.length,
    attempts: attempt.attempts,
  });
});
