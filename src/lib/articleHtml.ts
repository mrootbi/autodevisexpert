import { sanitizeHtml } from './sanitize';

const HEADING_DEMOTE: Record<string, string> = {
  H1: 'h2',
  H2: 'h3',
  H3: 'h4',
  H4: 'h5',
  H5: 'h6',
  H6: 'p',
};

function enhanceImages(root: Element, fallbackAlt: string): void {
  root.querySelectorAll('img').forEach((img) => {
    const alt = (img.getAttribute('alt') || '').trim();
    if (!alt) {
      img.setAttribute('alt', fallbackAlt);
    }
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    // Explicit dimensions reduce CLS when CMS HTML omits them.
    if (!img.hasAttribute('width')) {
      img.setAttribute('width', '800');
    }
    if (!img.hasAttribute('height')) {
      img.setAttribute('height', '450');
    }
    if (!img.hasAttribute('sizes')) {
      img.setAttribute('sizes', '(max-width: 768px) 100vw, 768px');
    }
  });
}

/** Demote body headings so the page template keeps a single <h1>. */
function demoteHeadings(root: Element, doc: Document): void {
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  for (const el of headings) {
    const nextTag = HEADING_DEMOTE[el.tagName];
    if (!nextTag) continue;
    const next = doc.createElement(nextTag);
    next.innerHTML = el.innerHTML;
    const className = el.getAttribute('class');
    if (className) next.setAttribute('class', className);
    const id = el.getAttribute('id');
    if (id) next.setAttribute('id', id);
    el.replaceWith(next);
  }
}

/**
 * Sanitize CMS HTML, demote headings under the page H1, and harden images
 * (alt, lazy-loading, dimensions) for SEO / PageSpeed audits.
 */
export function prepareArticleHtml(dirty: string, fallbackAlt: string): string {
  const clean = sanitizeHtml(dirty || '');
  if (!clean || typeof DOMParser === 'undefined') return clean;

  try {
    const doc = new DOMParser().parseFromString(`<div id="ade-article-root">${clean}</div>`, 'text/html');
    const root = doc.getElementById('ade-article-root');
    if (!root) return clean;

    demoteHeadings(root, doc);
    enhanceImages(
      root,
      fallbackAlt.trim() || 'Illustration article AutoDevis Expert',
    );

    // Prefer https for any leftover W3C SVG namespaces in inline markup.
    root.innerHTML = root.innerHTML.replaceAll(
      'http://www.w3.org/',
      'https://www.w3.org/',
    );

    return root.innerHTML;
  } catch {
    return clean;
  }
}
