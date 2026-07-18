import { buildLiveSitemapXml, rebuildAndPersistSitemap } from './sitemap';

const EMPTY_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

/**
 * Load a fresh sitemap XML built from live Supabase articles/reports.
 * Prefer rebuild+persist; fall back to read-only live build if upsert is blocked.
 */
export async function fetchSitemapXml(): Promise<string> {
  try {
    return await rebuildAndPersistSitemap();
  } catch {
    /* anon may lack write — still return a live build */
  }

  try {
    return await buildLiveSitemapXml();
  } catch {
    return EMPTY_SITEMAP;
  }
}
