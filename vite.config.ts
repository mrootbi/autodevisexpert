import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

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

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildSitemapXml(
  baseUrl: string,
  articles: { slug: string; date?: string }[],
  reports: { pathSlug: string; date?: string }[],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const root = baseUrl.replace(/\/$/, '');
  const urlEntry = (loc: string, lastmod: string, changefreq: string, priority: string) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;

  const entries = [
    ...STATIC_ROUTES.map((route) =>
      urlEntry(
        `${root}${route.path === '/' ? '/' : route.path}`,
        today,
        route.changefreq,
        route.priority,
      ),
    ),
    ...articles.map((article) =>
      urlEntry(`${root}/blog/${article.slug}`, article.date || today, 'monthly', '0.7'),
    ),
    ...reports.map((report) =>
      urlEntry(
        `${root}/devis-analyses/${report.pathSlug}`,
        report.date || today,
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

/**
 * Serve `/sitemap.xml` with Content-Type: application/xml during `vite` / `vite preview`,
 * rebuilding live from Supabase `blog_articles` + `quote_reports` (not a stale cache).
 */
function isValidAdsensePublisherId(publisherId: string): boolean {
  const id = publisherId.trim();
  if (!id || id === 'pub-0000000000000000') return false;
  return /^(ca-)?pub-\d{10,20}$/.test(id);
}

/** Serve `/ads.txt` locally from the same live Supabase publisher ID as production. */
function dynamicAdsTxtPlugin(env: Record<string, string>): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path !== '/ads.txt') {
        next();
        return;
      }

      const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      if (!supabaseUrl || !anonKey) {
        res.statusCode = 200;
        res.end('');
        return;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/app_settings?key=eq.adsense_publisher_id&select=value`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Accept: 'application/json',
            },
          },
        );
        const rows = response.ok ? ((await response.json()) as { value?: string }[]) : [];
        const publisherId = (rows[0]?.value || '').trim();
        if (!isValidAdsensePublisherId(publisherId)) {
          res.statusCode = 200;
          res.end('');
          return;
        }
        const pubId = publisherId.startsWith('ca-') ? publisherId.slice(3) : publisherId;
        res.statusCode = 200;
        res.end(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
      } catch {
        res.statusCode = 200;
        res.end('');
      }
    });
  };

  return {
    name: 'dynamic-ads-txt',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function dynamicSitemapPlugin(env: Record<string, string>): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path !== '/sitemap.xml') {
        next();
        return;
      }

      const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
      const siteBase = (env.SITE_BASE_URL || 'https://www.autodevisexpert.com').replace(/\/$/, '');

      if (!supabaseUrl || !anonKey) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end('<?xml version="1.0" encoding="UTF-8"?><error>Supabase env missing</error>');
        return;
      }

      try {
        const headers = {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        };

        const [blogRes, reportRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.blog_articles&select=value`, {
            headers,
          }),
          fetch(
            `${supabaseUrl}/rest/v1/quote_reports?published=eq.true&select=path_slug,created_at&order=created_at.desc&limit=500`,
            { headers },
          ),
        ]);

        if (!blogRes.ok) {
          throw new Error(`Supabase blog HTTP ${blogRes.status}`);
        }

        const blogRows = (await blogRes.json()) as { value?: string }[];
        let articles: { slug: string; date?: string }[] = [];
        if (blogRows[0]?.value) {
          const parsed = JSON.parse(blogRows[0].value) as {
            slug?: string;
            date?: string;
            title?: string;
          }[];
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
        }

        let reports: { pathSlug: string; date?: string }[] = [];
        if (reportRes.ok) {
          const reportRows = (await reportRes.json()) as {
            path_slug?: string;
            created_at?: string;
          }[];
          reports = (Array.isArray(reportRows) ? reportRows : [])
            .filter((row) => row?.path_slug)
            .map((row) => ({
              pathSlug: String(row.path_slug),
              date: String(row.created_at || '').slice(0, 10),
            }));
        }

        const xml = buildSitemapXml(siteBase, articles, reports);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.end(xml);
      } catch (err) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><error>${String(
            err instanceof Error ? err.message : 'sitemap unavailable',
          )}</error>`,
        );
      }
    });
  };

  return {
    name: 'dynamic-sitemap-xml',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), dynamicSitemapPlugin(env), dynamicAdsTxtPlugin(env)],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react-quill') || id.includes('/quill')) return 'vendor-quill';
            if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('mdast')) {
              return 'vendor-markdown';
            }
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('isomorphic-dompurify') || id.includes('dompurify')) return 'vendor-sanitize';
          },
        },
      },
    },
  };
});
