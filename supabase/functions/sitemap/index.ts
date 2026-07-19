/**
 * Dynamic sitemap for AutoDevis Expert.
 *
 * Always rebuilds from live Supabase rows (blog_articles + quote_reports).
 * Does NOT serve a stale app_settings.sitemap_xml cache.
 *
 * Deploy:
 *   supabase functions deploy sitemap --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SITE_BASE_URL = Deno.env.get('SITE_BASE_URL') ?? 'https://www.autodevisexpert.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/devis-analyses', priority: '0.7', changefreq: 'daily' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/politique-de-confidentialite', priority: '0.3', changefreq: 'yearly' },
  { path: '/cgu', priority: '0.3', changefreq: 'yearly' },
] as const;

const JUNK_SLUGS = new Set(['test', 'rfsfsf', 'asdf', 'xxx', 'demo', 'tmp']);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function isIndexableBlogSlug(slug: string, title = ''): boolean {
  const cleaned = (slug || '').trim().toLowerCase();
  if (!cleaned || cleaned.length < 3) return false;
  if (JUNK_SLUGS.has(cleaned)) return false;
  if (/^(test|demo|tmp|asdf|xxx|lorem)([-_]|$)/i.test(cleaned)) return false;
  const t = (title || '').trim();
  if (t && t.length < 8) return false;
  if (t && /^(test|rfsfsf|asdf|xxx|demo)$/i.test(t)) return false;
  return true;
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;
}

function buildSitemapXml(
  articles: { slug: string; date?: string }[],
  reports: { pathSlug: string; date?: string }[],
): string {
  const fallbackDate = today();
  const root = SITE_BASE_URL.replace(/\/$/, '');

  const entries = [
    ...STATIC_ROUTES.map((route) =>
      urlEntry(
        `${root}${route.path === '/' ? '/' : route.path}`,
        fallbackDate,
        route.changefreq,
        route.priority,
      ),
    ),
    ...articles
      .filter((a) => a.slug)
      .map((article) =>
        urlEntry(`${root}/blog/${article.slug}`, article.date || fallbackDate, 'monthly', '0.7'),
      ),
    ...reports
      .filter((r) => r.pathSlug)
      .map((report) =>
        urlEntry(
          `${root}/devis-analyses/${report.pathSlug}`,
          report.date || fallbackDate,
          'weekly',
          '0.6',
        ),
      ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [{ data: blog }, { data: reportRows }] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'blog_articles').maybeSingle(),
    supabase
      .from('quote_reports')
      .select('path_slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  let articles: { slug: string; date?: string }[] = [];
  if (blog?.value) {
    try {
      const parsed = JSON.parse(blog.value) as { slug?: string; date?: string; title?: string }[];
      if (Array.isArray(parsed)) {
        articles = parsed
          .filter(
            (a) =>
              a &&
              typeof a.slug === 'string' &&
              isIndexableBlogSlug(a.slug, a.title || ''),
          )
          .map((a) => ({ slug: a.slug as string, date: a.date }));
      }
    } catch {
      articles = [];
    }
  }

  const reports = (reportRows ?? []).map((row) => ({
    pathSlug: String(row.path_slug),
    date: String(row.created_at).slice(0, 10),
  }));

  return xmlResponse(buildSitemapXml(articles, reports));
});
