import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { safeMarkdownUrl } from '../lib/sanitize';
import { reportMarkdownHeadingComponents } from '../lib/reportMarkdown';
import { ShieldCheck } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: string;
  className?: string;
}

interface ParsedRecommendation {
  intro: string;
  steps: { number: number; text: string }[];
  outro: string;
}

/**
 * Real list markers only: "1. ", "2. ", … "9. " (optionally wrapped in **).
 * Never matches product codes like G12 / G13 (those are 2+ digits).
 */
const LIST_MARKER_SPLIT = /(?:^|\n|(?<=[.!?…]\s)|(?<=:\s)|(?<=\s))(?:\*\*)?([1-9])\.\s*(?:\*\*)?/;

function cleanMarkdownArtifacts(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    // Normalize "**1.**" / "1.**" markers before split helpers run
    .replace(/\*\*([1-9])\.\*\*/g, '$1. ')
    .replace(/\*\*([1-9])\.\s*/g, '$1. ')
    .replace(/([1-9])\.\*\*\s*/g, '$1. ')
    .trim();
}

/** Remove orphan ** left around titles like "Agissez rapidement** :" */
function sanitizeStepText(text: string): string {
  let t = text.trim();
  // Fix "Title**: body" / "Title** : body"
  t = t.replace(/\*\*\s*:/g, '**:');
  t = t.replace(/([^*\n]+?)\*\*\s*:/g, '**$1**:');
  // Drop dangling ** at ends of segments
  t = t.replace(/\*\*(?=\s*:)/g, '');
  t = t.replace(/(?<=:)\s*\*\*/g, ' ');
  t = t.replace(/\*\*(?=\s*$)/g, '');
  t = t.replace(/^\*\*(?=\s)/g, '');
  // Collapse "word** word" orphan closers mid-title
  t = t.replace(/(\w)\*\*(?=\s|:)/g, '$1');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

function peelOutro(stepText: string): { body: string; outro: string } {
  const sentences = stepText
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length < 2) return { body: stepText, outro: '' };

  const last = sentences[sentences.length - 1];
  if (
    /n['’]attendez|ne tardez|sans attendre|aggrave|urgent|immédiat|attention|important/i.test(last)
  ) {
    return {
      body: sentences.slice(0, -1).join(' ').trim(),
      outro: last,
    };
  }
  return { body: stepText, outro: '' };
}

function parseRecommendation(text: string): ParsedRecommendation {
  const normalized = cleanMarkdownArtifacts(text);
  if (!normalized) return { intro: '', steps: [], outro: '' };

  const parts = normalized.split(LIST_MARKER_SPLIT);

  // No safe single-digit list markers found → render whole blob via Markdown
  if (parts.length < 3) {
    return { intro: normalized, steps: [], outro: '' };
  }

  const intro = sanitizeStepText(parts[0] || '');
  const steps: { number: number; text: string }[] = [];
  let outro = '';

  for (let i = 1; i < parts.length - 1; i += 2) {
    const number = Number.parseInt(parts[i], 10);
    let body = sanitizeStepText(parts[i + 1] || '');
    if (!Number.isFinite(number) || number < 1 || !body) continue;

    // Only peel warning outro from the last captured step
    const isLastPair = i + 2 >= parts.length - 1;
    if (isLastPair) {
      const peeled = peelOutro(body);
      body = peeled.body;
      outro = peeled.outro;
    }

    steps.push({ number, text: body });
  }

  // Re-number sequentially in case AI skipped / duplicated
  const sequential = steps.map((step, index) => ({
    number: index + 1,
    text: step.text,
  }));

  return { intro, steps: sequential, outro: sanitizeStepText(outro) };
}

function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={safeMarkdownUrl}
      components={{
        p: ({ children: c }) => <span className="leading-relaxed">{c}</span>,
        strong: ({ children: c }) => (
          <strong className="font-bold text-slate-900">{c}</strong>
        ),
        em: ({ children: c }) => <em className="italic text-slate-800">{c}</em>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Ensure bold titles like "Agissez rapidement : detail" render with the label bold. */
function formatStepMarkdown(text: string): string {
  const cleaned = sanitizeStepText(text);
  // Already has markdown bold
  if (/\*\*[^*]+\*\*/.test(cleaned)) return cleaned;

  const colon = cleaned.indexOf(':');
  if (colon > 0 && colon < 100) {
    const title = cleaned.slice(0, colon).trim();
    const detail = cleaned.slice(colon + 1).trim();
    return detail ? `**${title}** : ${detail}` : `**${title}**`;
  }
  return cleaned;
}

export default function RecommendationCard({ recommendation, className = '' }: RecommendationCardProps) {
  const parsed = useMemo(() => parseRecommendation(recommendation), [recommendation]);
  const { intro, steps, outro } = parsed;

  if (!recommendation.trim()) return null;

  return (
    <aside
      className={`mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20 ${className}`}
      aria-label="Recommandation expert"
    >
      <div className="border-l-4 border-indigo-600 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Recommandation
          </p>
        </div>

        {steps.length > 0 ? (
          <>
            {intro && (
              <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-[15px]">
                <MarkdownText>{intro}</MarkdownText>
              </p>
            )}

            <ol className="mt-5 flex list-none flex-col gap-4 p-0">
              {steps.map((step) => (
                <li key={`step-${step.number}`} className="flex gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-sm">
                    {step.number}
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-indigo-100/80 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-indigo-900/30 dark:bg-slate-900/40 dark:text-slate-200">
                    <MarkdownText>{formatStepMarkdown(step.text)}</MarkdownText>
                  </div>
                </li>
              ))}
            </ol>

            {outro && (
              <p className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium leading-relaxed text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
                <MarkdownText>{outro}</MarkdownText>
              </p>
            )}
          </>
        ) : (
          <div className="prose-article mt-4 text-sm text-slate-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={safeMarkdownUrl}
              components={reportMarkdownHeadingComponents}
            >
              {cleanMarkdownArtifacts(recommendation)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </aside>
  );
}
