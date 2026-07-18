import { SITE_BASE_URL } from './siteUrl';

/** Primary public nav — keep labels aligned with Navbar for sitelinks. */
export const SITE_NAV_ITEMS = [
  { name: 'Accueil', path: '/' },
  { name: 'Blog', path: '/blog' },
  { name: 'Analyser un devis', path: '/#outil' },
  { name: 'Contact', path: '/contact' },
] as const;

export type SiteNavItem = (typeof SITE_NAV_ITEMS)[number];

/** JSON-LD SiteNavigationElement list for Google sitelinks discovery. */
export function buildSiteNavigationJsonLd(baseUrl: string = SITE_BASE_URL) {
  const root = baseUrl.replace(/\/$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Navigation principale AutoDevis Expert',
    itemListElement: SITE_NAV_ITEMS.map((item, index) => {
      const url =
        item.path === '/'
          ? `${root}/`
          : item.path.startsWith('/#')
            ? `${root}${item.path}`
            : `${root}${item.path}`;

      return {
        '@type': 'SiteNavigationElement',
        position: index + 1,
        name: item.name,
        url,
      };
    }),
  };
}
