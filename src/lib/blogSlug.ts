import { slugify } from './blogStore';

/** Normalize any model output into a safe URL slug. */
export function cleanSlugOutput(raw: string, fallbackTitle = ''): string {
  const fromModel = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^slug\s*[:=]\s*/i, '')
    .split(/[\s\n\r]+/)[0]
    .replace(/^\/+|\/+$/g, '');

  const cleaned = slugify(fromModel);
  if (cleaned) return cleaned;
  return slugify(fallbackTitle) || 'article';
}

function functionsBase(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
}

/**
 * Ask Gemini (via blog-slug Edge Function) for an SEO-friendly French slug.
 * Falls back to local slugify if the API fails.
 */
export async function generateSlugWithAi(title: string): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed) return '';

  const base = functionsBase();
  const key = anonKey();
  if (!base || !key) {
    return slugify(trimmed) || 'article';
  }

  try {
    const res = await fetch(`${base}/blog-slug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ title: trimmed }),
    });

    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (!res.ok || !data.text) {
      throw new Error(data.error || `Erreur slug IA (${res.status})`);
    }
    return cleanSlugOutput(data.text, trimmed);
  } catch {
    // Prefer a usable local slug over blocking publish.
    return slugify(trimmed) || 'article';
  }
}
