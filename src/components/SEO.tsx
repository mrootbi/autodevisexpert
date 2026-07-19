import { useEffect } from 'react';
import { SITE_BASE_URL as BASE_URL } from '../lib/siteUrl';
import { DEFAULT_TWITTER, SITE_NAME } from '../lib/socialMeta';

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  /** Absolute URL or site path (e.g. `/og-default.png`). Used for og:image / twitter:image. */
  image?: string;
  /** Comma-separated or array — injected as <meta name="keywords">. */
  keywords?: string | string[];
  /** When true, sets robots to noindex,nofollow (admin, 404). */
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE = SITE_NAME;
const DEFAULT_DESC = DEFAULT_TWITTER.description;
const DEFAULT_OG_IMAGE = DEFAULT_TWITTER.images[0];
/** Google typically truncates meta descriptions around 150–160 characters. */
const META_DESC_MAX = 155;

/** Truncate for SERP snippets — prefers a word boundary, ends with an ellipsis when cut. */
export function truncateMetaDescription(text: string, max = META_DESC_MAX): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const budget = Math.max(40, max - 1);
  const cut = cleaned.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > Math.floor(budget * 0.55) ? cut.slice(0, lastSpace) : cut).replace(
    /[.,;:!?\-–—…]+$/u,
    '',
  );
  return `${base}…`;
}

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

function normalizeKeywordsMeta(keywords?: string | string[]): string {
  if (!keywords) return '';
  const parts = Array.isArray(keywords) ? keywords : keywords.split(/[,;\n]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.join(', ');
}

/** Apply the full Twitter Card suite (name + property) — required by most SEO auditors. */
function applyTwitterCard(opts: {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  url: string;
}) {
  const { title, description, imageUrl, imageAlt, url } = opts;
  const card = DEFAULT_TWITTER.card;

  setMeta('name', 'twitter:card', card);
  setMeta('name', 'twitter:site', DEFAULT_TWITTER.site);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', imageUrl);
  setMeta('name', 'twitter:image:src', imageUrl);
  setMeta('name', 'twitter:image:alt', imageAlt);
  setMeta('name', 'twitter:url', url);

  setMeta('property', 'twitter:card', card);
  setMeta('property', 'twitter:site', DEFAULT_TWITTER.site);
  setMeta('property', 'twitter:title', title);
  setMeta('property', 'twitter:description', description);
  setMeta('property', 'twitter:image', imageUrl);
  setMeta('property', 'twitter:image:alt', imageAlt);
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  canonicalPath = '/',
  image,
  keywords,
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = buildFullTitle(title);
  const metaDescription = truncateMetaDescription(description);
  const canonical = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
  const imageUrl = resolveImageUrl(image);
  const keywordsContent = normalizeKeywordsMeta(keywords);
  const seoKey = canonicalPath;
  const robots = noIndex ? 'noindex, nofollow' : 'index, follow';
  const imageAlt = `${SITE} — ${title}`.slice(0, 120);

  useEffect(() => {
    document.title = fullTitle;
    setMeta('name', 'description', metaDescription);
    setMeta('name', 'robots', robots);

    if (keywordsContent) {
      setMeta('name', 'keywords', keywordsContent);
    } else {
      document.head.querySelector('meta[name="keywords"]')?.remove();
    }

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', 'fr_FR');
    setMeta('property', 'og:site_name', SITE);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', metaDescription);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:image:alt', imageAlt);
    setMeta('property', 'og:image:secure_url', imageUrl);
    setMeta('property', 'og:image:type', 'image/png');
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');

    applyTwitterCard({
      title: fullTitle || DEFAULT_TWITTER.title,
      description: metaDescription || DEFAULT_TWITTER.description,
      imageUrl: imageUrl || DEFAULT_TWITTER.images[0],
      imageAlt: imageAlt || DEFAULT_TWITTER.imageAlt,
      url: canonical,
    });

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
  }, [fullTitle, metaDescription, canonical, imageUrl, imageAlt, keywordsContent, robots, seoKey, JSON.stringify(jsonLd)]);

  return null;
}

export { DEFAULT_DESC, DEFAULT_OG_IMAGE, SITE as SITE_NAME, META_DESC_MAX, DEFAULT_TWITTER };
