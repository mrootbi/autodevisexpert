/** Normalize keyword lists from tags UI, CSV, or AI output. */
export function normalizeKeywords(input: string[] | string | null | undefined): string[] {
  const parts = Array.isArray(input)
    ? input
    : String(input ?? '')
        .split(/[,;\n]+/)
        .flatMap((chunk) => chunk.split(/\s{2,}/));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const cleaned = raw
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^[-*•]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length > 80) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 12) break;
  }
  return out;
}

export function keywordsToMetaContent(keywords: string[] | undefined): string {
  return normalizeKeywords(keywords).join(', ');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function functionsBase(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
}

/**
 * Ask Gemini (via blog-keywords Edge Function) for 5–8 French automotive SEO keywords.
 * Falls back to title-derived tokens if the API fails.
 */
export async function generateKeywordsWithAi(opts: {
  title: string;
  excerpt?: string;
  content?: string;
  category?: string;
}): Promise<string[]> {
  const title = opts.title.trim();
  if (!title) return [];

  const base = functionsBase();
  const key = anonKey();
  const excerpt = (opts.excerpt || '').trim().slice(0, 400);
  const content = stripHtml(opts.content || '').slice(0, 2500);
  const category = (opts.category || '').trim().slice(0, 80);

  if (!base || !key) {
    return fallbackKeywords(title, category);
  }

  try {
    const res = await fetch(`${base}/blog-keywords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ title, excerpt, content, category }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      text?: string;
      keywords?: string[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || `Erreur keywords IA (${res.status})`);
    }

    const fromArray = normalizeKeywords(data.keywords);
    if (fromArray.length >= 3) return fromArray.slice(0, 8);

    const fromText = normalizeKeywords(data.text);
    if (fromText.length >= 3) return fromText.slice(0, 8);

    return fallbackKeywords(title, category);
  } catch {
    return fallbackKeywords(title, category);
  }
}

function fallbackKeywords(title: string, category: string): string[] {
  const seeds = [
    ...title.split(/[:\-–—,|]/).map((s) => s.trim()),
    category,
    'devis garagiste',
    'prix réparation auto',
    'arnaque garagiste',
  ];
  return normalizeKeywords(seeds).slice(0, 6);
}
