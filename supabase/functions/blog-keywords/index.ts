/**
 * Gemini SEO keyword generator for the blog CMS.
 * Deploy: supabase functions deploy blog-keywords --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const GEMINI_KEY = 'gemini_api_key';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Abuse / cost protection — per-IP sliding window (in-memory, per isolate). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  return cf || realIp || forwarded || 'unknown';
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const inWindow = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (inWindow.length >= RATE_MAX) {
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

const SYSTEM_PROMPT = `Tu es un expert SEO automobile français (search intent, longue traîne, Google FR).
À partir du titre et du contenu d'un article de blog, génère 5 à 8 mots-clés SEO à fort volume / intention commerciale ou informationnelle, en français.
Exemples de style: "devis climatisation", "compresseur HS", "prix recharge clim", "skoda octavia".
Règles:
- Réponds UNIQUEMENT avec une liste séparée par des virgules
- Pas de numérotation, pas de markdown, pas de guillemets, pas d'explication
- Minuscules sauf noms propres / acronymes (Skoda, FAP, TDI…)
- Chaque mot-clé: 2 à 5 mots max, concrets, liés à la réparation auto / devis / pièces`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitize(input: string, max: number): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
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

function parseKeywordList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const cleaned = part.replace(/^[-*•\d.)\s]+/, '').replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!cleaned || cleaned.length > 80) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 8) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  if (!allowRequest(clientIp(req))) {
    return json(429, { error: 'Trop de requêtes. Réessayez dans une minute.', code: 'CLIENT_RATE_LIMITED' });
  }

  let title = '';
  let excerpt = '';
  let content = '';
  let category = '';
  try {
    const body = await req.json();
    title = sanitize(String(body?.title ?? ''), 300);
    excerpt = sanitize(String(body?.excerpt ?? ''), 400);
    content = sanitize(String(body?.content ?? ''), 2500);
    category = sanitize(String(body?.category ?? ''), 80);
  } catch {
    return json(400, { error: 'Invalid JSON', code: 'BAD_REQUEST' });
  }

  if (!title) {
    return json(400, { error: 'Titre manquant.', code: 'EMPTY_INPUT' });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', GEMINI_KEY)
    .maybeSingle();

  const keys = parseKeys(String(data?.value ?? ''));
  if (keys.length === 0) {
    return json(503, { error: 'Clé Gemini absente.', code: 'GEMINI_KEY_MISSING' });
  }

  const apiKey = keys[Math.floor(Math.random() * keys.length)];
  const userPrompt = [
    `Titre: ${title}`,
    category ? `Catégorie: ${category}` : '',
    excerpt ? `Extrait: ${excerpt}` : '',
    content ? `Contenu (extrait): ${content}` : '',
    'Génère 5 à 8 mots-clés SEO français séparés par des virgules.',
  ]
    .filter(Boolean)
    .join('\n');

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 180 },
  };

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return json(res.status, {
        error: errBody?.error?.message || `Erreur Gemini (${res.status})`,
        code: 'GEMINI_FAILED',
      });
    }

    const dataRes = await res.json();
    const text = String(dataRes?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    if (!text) {
      return json(502, { error: 'Réponse Gemini vide.', code: 'GEMINI_EMPTY' });
    }

    const keywords = parseKeywordList(text);
    return json(200, { text, keywords, model: MODEL });
  } catch (err) {
    return json(502, {
      error: err instanceof Error ? err.message : 'Erreur réseau Gemini',
      code: 'GEMINI_NETWORK',
    });
  }
});
