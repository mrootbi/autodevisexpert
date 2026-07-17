import { useEffect, useState } from 'react';
import { fetchSitemapXml } from '../lib/fetchSitemapXml';

/**
 * Client-side fallback for `/sitemap.xml`.
 *
 * Note: browsers/React cannot change the HTTP Content-Type of the initial
 * document response. On Hostinger, `public/.htaccess` + `sitemap.php` serve
 * real `application/xml` to crawlers. This page covers in-app navigation
 * and hosts without the PHP proxy (replaces the document with raw XML).
 */
export default function SitemapPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const xml = await fetchSitemapXml();
        if (cancelled) return;

        // Replace the HTML shell with the sitemap document for this tab.
        document.open('text/xml');
        document.write(xml);
        document.close();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger le sitemap.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <pre style={{ padding: 24, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
        {`<!-- sitemap error: ${error} -->`}
      </pre>
    );
  }

  return (
    <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#64748b' }}>
      Chargement du sitemap…
    </p>
  );
}
