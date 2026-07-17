/**
 * Build-time sitemap fallback (public/sitemap.fallback.xml).
 *
 * Prefer the live endpoint in production:
 *   - Hostinger: /sitemap.xml → public/sitemap.php (reads Supabase)
 *   - Supabase Edge: /functions/v1/sitemap
 *
 * Usage:
 *   npm run sitemap
 *   node scripts/generate-sitemap.mjs
 *
 * With Supabase credentials in env (.env), pulls live blog_articles.
 * Otherwise falls back to parsing src/lib/articles.ts seed data.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = process.env.SITE_BASE_URL || 'https://autodevisexpert.com';
const OUT = join(ROOT, 'public', 'sitemap.fallback.xml');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/politique-de-confidentialite', priority: '0.3', changefreq: 'yearly' },
  { path: '/cgu', priority: '0.3', changefreq: 'yearly' },
];

function loadEnvFile() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadArticlesFromSeed() {
  const source = readFileSync(join(ROOT, 'src', 'lib', 'articles.ts'), 'utf8');
  const blocks = source.split(/\{\s*\n\s*slug:/).slice(1);
  const articles = [];
  for (const block of blocks) {
    const slugMatch = block.match(/^\s*['"]([^'"]+)['"]/);
    const dateMatch = block.match(/date:\s*['"]([^'"]+)['"]/);
    if (slugMatch && dateMatch) {
      articles.push({ slug: slugMatch[1], date: dateMatch[1] });
    }
  }
  return articles;
}

function supabaseCreds() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

async function loadArticlesFromSupabase() {
  const creds = supabaseCreds();
  if (!creds) return null;

  const endpoint = `${creds.url}/rest/v1/app_settings?key=eq.blog_articles&select=value`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]?.value) return null;
  try {
    const parsed = JSON.parse(rows[0].value);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((a) => a && typeof a.slug === 'string')
      .map((a) => ({ slug: a.slug, date: a.date }));
  } catch {
    return null;
  }
}

async function loadReportsFromSupabase() {
  const creds = supabaseCreds();
  if (!creds) return [];

  const endpoint = `${creds.url}/rest/v1/quote_reports?published=eq.true&select=path_slug,created_at&order=created_at.desc&limit=500`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: creds.key,
      Authorization: `Bearer ${creds.key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    pathSlug: row.path_slug,
    date: String(row.created_at || '').slice(0, 10),
  }));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;
}

function buildSitemap(articles, reports = []) {
  const fallbackDate = today();
  const entries = [
    ...STATIC_ROUTES.map((route) =>
      urlEntry({
        loc: `${BASE_URL}${route.path === '/' ? '/' : route.path}`,
        lastmod: fallbackDate,
        changefreq: route.changefreq,
        priority: route.priority,
      }),
    ),
    ...articles.map((article) =>
      urlEntry({
        loc: `${BASE_URL}/blog/${article.slug}`,
        lastmod: article.date || fallbackDate,
        changefreq: 'monthly',
        priority: '0.7',
      }),
    ),
    ...reports.map((report) =>
      urlEntry({
        loc: `${BASE_URL}/devis-analyses/${report.pathSlug}`,
        lastmod: report.date || fallbackDate,
        changefreq: 'weekly',
        priority: '0.6',
      }),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

loadEnvFile();

const remote = await loadArticlesFromSupabase();
const articles = remote ?? loadArticlesFromSeed();
const reports = await loadReportsFromSupabase();
const xml = buildSitemap(articles, reports);

writeFileSync(OUT, xml, 'utf8');
// Do NOT write public/sitemap.xml — a static file would block the dynamic
// Hostinger PHP proxy / Vite middleware / React route for /sitemap.xml.

console.log(
  `Wrote ${OUT} (${STATIC_ROUTES.length} static + ${articles.length} articles + ${reports.length} reports${remote ? ' from Supabase' : ' from seed'})`,
);
