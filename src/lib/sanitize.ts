import DOMPurify from 'isomorphic-dompurify';

const MAX_USER_TEXT_CHARS = 8_000;

const SAFE_IMG_STYLE_PROP =
  /^(?:width|max-width|height|max-height|float|margin|margin-left|margin-right|margin-top|margin-bottom|display)$/i;

function sanitizeImgStyle(value: string): string {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const prop = part.split(':')[0]?.trim() ?? '';
      return SAFE_IMG_STYLE_PROP.test(prop);
    })
    .join('; ');
}

let imgStyleHookRegistered = false;

function ensureImgStyleHook(): void {
  if (imgStyleHookRegistered) return;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName !== 'style') return;
    if (node.nodeName !== 'IMG') {
      data.keepAttr = false;
      return;
    }
    const cleaned = sanitizeImgStyle(data.attrValue || '');
    if (!cleaned) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = cleaned.endsWith(';') ? cleaned : `${cleaned};`;
    data.keepAttr = true;
  });
  imgStyleHookRegistered = true;
}

/** Strip control chars and cap length before sending user text to the API. */
export function sanitizeUserText(input: string, maxLen = MAX_USER_TEXT_CHARS): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLen);
}

/** Safe HTML for blog / CMS content rendered via dangerouslySetInnerHTML. */
export function sanitizeHtml(dirty: string): string {
  ensureImgStyleHook();
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    // Keep semantic headings for SEO — never strip h1–h6 from CMS HTML.
    ADD_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ADD_ATTR: ['target', 'width', 'height', 'style', 'class', 'alt', 'loading', 'decoding', 'sizes'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta', 'base'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  });
}

/** Block dangerous URL schemes in markdown links. */
export function safeMarkdownUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }
  return trimmed;
}

export { MAX_USER_TEXT_CHARS };
