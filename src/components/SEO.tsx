import { useEffect } from 'react';
import { SITE_BASE_URL as BASE_URL } from '../lib/siteUrl';

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  /** Absolute URL or site path (e.g. `/og-default.png`). Used for og:image / twitter:image. */
  image?: string;
  /** When true, sets robots to noindex,nofollow (admin, 404). */
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE = 'AutoDevis Expert';
const DEFAULT_DESC =
  "Analysez votre devis garagiste, comparez le prix réel et obtenez l'avis d'un expert mécanicien. Évitez les marges gonflées et les pièces surfacturées.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function resolveImageUrl(image?: string): string {
  if (!image) return DEFAULT_OG_IMAGE;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  const path = image.startsWith('/') ? image : `/${image}`;
  return `${BASE_URL}${path}`;
}

/** Avoid "Brand | Brand" when the title already contains the site name. */
function buildFullTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.includes('|')) return trimmed;
  if (trimmed.toLowerCase().includes(SITE.toLowerCase())) return trimmed;
  return `${trimmed} | ${SITE}`;
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  canonicalPath = '/',
  image,
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = buildFullTitle(title);
  const canonical = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
  const imageUrl = resolveImageUrl(image);
  const seoKey = canonicalPath;
  const robots = noIndex ? 'noindex, nofollow' : 'index, follow';

  useEffect(() => {
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', robots);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', 'fr_FR');
    setMeta('property', 'og:site_name', SITE);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', imageUrl);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;

    let ldEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      ldEl = document.createElement('script');
      ldEl.type = 'application/ld+json';
      ldEl.text = JSON.stringify(jsonLd);
      ldEl.dataset.seoKey = seoKey;
      document.head.appendChild(ldEl);
    }
    return () => {
      if (ldEl && ldEl.parentNode) ldEl.parentNode.removeChild(ldEl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, description, canonical, imageUrl, robots, seoKey, JSON.stringify(jsonLd)]);

  return null;
}

export { DEFAULT_DESC, DEFAULT_OG_IMAGE, SITE as SITE_NAME };
