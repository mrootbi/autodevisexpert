/**
 * Split sanitized article HTML so an in-article ad can sit after the 2nd or 3rd
 * closing </p> (prefer 3rd when the body is long enough).
 */
export function splitHtmlForInArticleAd(html: string): { before: string; after: string } | null {
  const source = html.trim();
  if (!source) return null;

  const closings = [...source.matchAll(/<\/p>/gi)];
  if (closings.length < 2) return null;

  const paragraphIndex = closings.length >= 3 ? 2 : 1; // 0-based → after 3rd or 2nd </p>
  const match = closings[paragraphIndex];
  if (match.index == null) return null;

  const cut = match.index + match[0].length;
  const before = source.slice(0, cut).trim();
  const after = source.slice(cut).trim();
  if (!before || !after) return null;

  return { before, after };
}
