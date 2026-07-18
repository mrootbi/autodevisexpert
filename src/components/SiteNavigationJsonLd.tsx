import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildSiteNavigationJsonLd } from '../lib/siteNavigation';

const SCRIPT_ID = 'ade-site-navigation-jsonld';

/**
 * Injects SiteNavigationElement JSON-LD sitewide (skipped on admin).
 * Complements the static block in index.html for JS-rendered crawlers.
 */
export default function SiteNavigationJsonLd() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/mouadbi');

  useEffect(() => {
    const existing = document.getElementById(SCRIPT_ID);
    if (isAdmin) {
      existing?.remove();
      return;
    }

    const payload = JSON.stringify(buildSiteNavigationJsonLd());
    let el = existing as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = SCRIPT_ID;
      document.head.appendChild(el);
    }
    el.text = payload;

    return () => {
      /* keep script across public route changes; Layout unmount clears via id replace */
    };
  }, [isAdmin]);

  return null;
}
