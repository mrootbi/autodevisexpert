/**
 * Lightweight Gemini slug generator for the blog CMS.
 * Deploy: supabase functions deploy blog-slug --no-verify-jwt
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

const SYSTEM_PROMPT =
  "Tu es un expert SEO français. À partir du titre fourni, génère UNIQUEMENT un slug URL optimisé : minuscules, sans accents, mots séparés par des tirets, sans slash ni ponctuation, maximum 80 caractères. Réponds avec le slug seul — aucun texte, aucune guillemet, aucun markdown.";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitize(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 300);
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let title = '';
  try {
    const body = await req.json();
    title = sanitize(String(body?.title ?? body?.userInput ?? ''));
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
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: `Titre de l'article : ${title}` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 64 },
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
    const text = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json(502, { error: 'Réponse Gemini vide.', code: 'GEMINI_EMPTY' });
    }

    return json(200, { text, model: MODEL });
  } catch (err) {
    return json(502, {
      error: err instanceof Error ? err.message : 'Erreur réseau Gemini',
      code: 'GEMINI_NETWORK',
    });
  }
});
