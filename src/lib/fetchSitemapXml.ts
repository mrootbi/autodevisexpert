import { supabase } from './supabase';
import { rebuildAndPersistSitemap } from './sitemap';

const EMPTY_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

/** Load the live sitemap XML from Supabase (`app_settings.sitemap_xml`). */
export async function fetchSitemapXml(): Promise<string> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'sitemap_xml')
    .maybeSingle();

  if (!error && data?.value && data.value.includes('<urlset')) {
    return data.value;
  }

  try {
    return await rebuildAndPersistSitemap();
  } catch {
    return EMPTY_SITEMAP;
  }
}
