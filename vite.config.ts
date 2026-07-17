import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serve `/sitemap.xml` with Content-Type: application/xml during `vite` / `vite preview`,
 * reading the live XML from Supabase `app_settings.sitemap_xml`.
 */
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

      if (!supabaseUrl || !anonKey) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end('<?xml version="1.0" encoding="UTF-8"?><error>Supabase env missing</error>');
        return;
      }

      try {
        const endpoint = `${supabaseUrl}/rest/v1/app_settings?key=eq.sitemap_xml&select=value`;
        const response = await fetch(endpoint, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Supabase HTTP ${response.status}`);
        }

        const rows = (await response.json()) as { value?: string }[];
        const xml = rows[0]?.value;
        if (!xml || !xml.includes('<urlset')) {
          throw new Error('sitemap_xml empty');
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
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
    plugins: [react(), dynamicSitemapPlugin(env)],
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
