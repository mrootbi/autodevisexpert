import DOMPurify from 'isomorphic-dompurify';

const MAX_USER_TEXT_CHARS = 8_000;

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
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta', 'base'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
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
