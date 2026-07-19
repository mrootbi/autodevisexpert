import type { Components } from 'react-markdown';

/**
 * Demote markdown headings so report pages keep a single page-level <h1>.
 * # → h2, ## → h3, ###+ → h4
 */
export const reportMarkdownHeadingComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-6 font-display text-xl font-bold text-slate-900 first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-5 font-display text-lg font-bold text-slate-900 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 font-display text-base font-bold text-slate-900 first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 text-base font-semibold text-slate-800 first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <p className="mt-3 text-sm font-semibold text-slate-800 first:mt-0">{children}</p>
  ),
  h6: ({ children }) => (
    <p className="mt-2 text-sm font-semibold text-slate-700 first:mt-0">{children}</p>
  ),
};

/** Truncate a title at a word boundary for SERP / H1 length audits. */
export function truncateHeading(text: string, max = 70): string {
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
