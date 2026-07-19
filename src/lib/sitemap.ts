import { BlogArticle } from './types';
import { SITE_BASE_URL } from './siteUrl';
import { supabase } from './supabase';

export interface SitemapArticleRef {
  slug: string;
  date?: string;
}

export interface SitemapReportRef {
  pathSlug: string;
  date?: string;
}

const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/devis-analyses', priority: '0.7', changefreq: 'daily' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/politique-de-confidentialite', priority: '0.3', changefreq: 'yearly' },
  { path: '/cgu', priority: '0.3', changefreq: 'yearly' },
];

const SUPABASE_SITEMAP_KEY = 'sitemap_xml';
const SUPABASE_BLOG_KEY = 'blog_articles';

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

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;
}

/** Build a full sitemap XML document from static routes + blog + quote reports. */
export function buildSitemapXml(
  articles: SitemapArticleRef[],
  reports: SitemapReportRef[] = [],
  baseUrl: string = SITE_BASE_URL,
): string {
  const fallbackDate = today();
  const root = baseUrl.replace(/\/$/, '');

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
      .filter((a) => isIndexableBlogSlug(a.slug))
      .map((article) =>
        urlEntry(
          `${root}/blog/${article.slug}`,
          article.date || fallbackDate,
          'monthly',
          '0.7',
        ),
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

const JUNK_SLUGS = new Set(['test', 'rfsfsf', 'asdf', 'xxx', 'demo', 'tmp']);

/** Drop dummy / CMS smoke-test posts so they never reach Search Console. */
export function isIndexableBlogSlug(slug: string): boolean {
  const cleaned = (slug || '').trim().toLowerCase();
  if (!cleaned || cleaned.length < 3) return false;
  if (JUNK_SLUGS.has(cleaned)) return false;
  if (/^(test|demo|tmp|asdf|xxx|lorem)([-_]|$)/i.test(cleaned)) return false;
  return true;
}

export function isIndexableBlogArticle(article: Pick<BlogArticle, 'slug' | 'title'>): boolean {
  if (!isIndexableBlogSlug(article.slug)) return false;
  const title = (article.title || '').trim();
  if (title.length < 8) return false;
  if (/^(test|rfsfsf|asdf|xxx|demo)$/i.test(title)) return false;
  return true;
}

export function articlesToSitemapRefs(articles: BlogArticle[]): SitemapArticleRef[] {
  return articles
    .filter(isIndexableBlogArticle)
    .map((a) => ({ slug: a.slug, date: a.date }));
}

async function loadBlogRefsFromSupabase(): Promise<SitemapArticleRef[]> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SUPABASE_BLOG_KEY)
    .maybeSingle();

  if (!data?.value) return [];
  try {
    const parsed = JSON.parse(data.value) as BlogArticle[];
    if (!Array.isArray(parsed)) return [];
    return articlesToSitemapRefs(parsed);
  } catch {
    return [];
  }
}

async function loadReportRefsFromSupabase(limit = 500): Promise<SitemapReportRef[]> {
  const { data, error } = await supabase
    .from('quote_reports')
    .select('path_slug, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => ({
    pathSlug: String(row.path_slug),
    date: String(row.created_at).slice(0, 10),
  }));
}

/** Build sitemap XML from live Supabase blog_articles + quote_reports (no cache). */
export async function buildLiveSitemapXml(): Promise<string> {
  const [articles, reports] = await Promise.all([
    loadBlogRefsFromSupabase(),
    loadReportRefsFromSupabase(500),
  ]);
  return buildSitemapXml(articles, reports);
}

/** Rebuild sitemap from blog articles + quote reports and persist to Supabase. */
export async function rebuildAndPersistSitemap(): Promise<string> {
  const xml = await buildLiveSitemapXml();
  await supabase.from('app_settings').upsert(
    { key: SUPABASE_SITEMAP_KEY, value: xml, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  return xml;
}
