/**
 * Dynamic /sitemap.xml for Vercel (Vite SPA — not Next.js).
 *
 * Always rebuilds from live Supabase data:
 *   - app_settings.blog_articles (JSON array)
 *   - quote_reports (published)
 *
 * Equivalent to Next.js `export const dynamic = 'force-dynamic'` /
 * `revalidate = 0`: no Full Route Cache, no static public/sitemap.xml.
 */

export const config = {
  runtime: 'edge',
};

const SITE_BASE_URL = (
  process.env.SITE_BASE_URL ||
  process.env.VITE_SITE_BASE_URL ||
  'https://www.autodevisexpert.com'
).replace(/\/$/, '');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
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
  const root = SITE_BASE_URL;

  const entries = [
    ...STATIC_ROUTES.map((route) =>
      urlEntry(
        `${root}${route.path === '/' ? '/' : route.path}`,
        fallbackDate,
        route.changefreq,
        route.priority,
      ),
    ),
    ...articles.map((article) =>
      urlEntry(`${root}/blog/${article.slug}`, article.date || fallbackDate, 'monthly', '0.7'),
    ),
    ...reports.map((report) =>
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
      // Force dynamic: bypass CDN / browser stale caches for crawlers.
      'Cache-Control': 'public, max-age=0, s-maxage=0, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function supabaseCreds(): { url: string; key: string } | null {
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

async function fetchJson(endpoint: string, key: string): Promise<unknown> {
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status} for ${endpoint}`);
  }
  return response.json();
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const creds = supabaseCreds();
  if (!creds) {
    return xmlResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Supabase env missing</error>',
      503,
    );
  }

  try {
    const [blogRows, reportRows] = await Promise.all([
      fetchJson(
        `${creds.url}/rest/v1/app_settings?key=eq.blog_articles&select=value`,
        creds.key,
      ) as Promise<{ value?: string }[]>,
      fetchJson(
        `${creds.url}/rest/v1/quote_reports?published=eq.true&select=path_slug,created_at&order=created_at.desc&limit=500`,
        creds.key,
      ) as Promise<{ path_slug?: string; created_at?: string }[]>,
    ]);

    let articles: { slug: string; date?: string }[] = [];
    const raw = Array.isArray(blogRows) ? blogRows[0]?.value : undefined;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { slug?: string; date?: string; title?: string }[];
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

    const reports = (Array.isArray(reportRows) ? reportRows : [])
      .filter((row) => row?.path_slug)
      .map((row) => ({
        pathSlug: String(row.path_slug),
        date: String(row.created_at || '').slice(0, 10),
      }));

    return xmlResponse(buildSitemapXml(articles, reports));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sitemap unavailable';
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      503,
    );
  }
}
