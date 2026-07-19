import { useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { BlogArticle } from '../lib/types';
import { prepareArticleHtml } from '../lib/articleHtml';
import ArticleCover from './ArticleCover';

interface BlogArticlePreviewProps {
  open: boolean;
  article: BlogArticle;
  onClose: () => void;
}

export default function BlogArticlePreview({ open, article, onClose }: BlogArticlePreviewProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-trust-600">Aperçu article</p>
            <p className="text-sm text-slate-500">Rendu tel qu&apos;affiché sur le site public</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <header className="relative overflow-hidden text-white">
            <div className="absolute inset-0">
              <ArticleCover article={article} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-trust-950/90 via-trust-900/50 to-trust-800/30" />
            </div>
            <div className="relative px-4 py-10 sm:px-8 sm:py-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{article.category}</span>
              {/* Preview dialog title — kept off the h1 map since this modal is never the live public DOM. */}
              <p className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{article.title || 'Sans titre'}</p>
              <p className="mt-3 text-base text-white/90">{article.excerpt || 'Aucun extrait renseigné.'}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(article.date)}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {article.readingTime}</span>
                <span>par <strong className="font-semibold text-white">{article.author}</strong></span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
            {article.content.trim() ? (
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{
                  __html: prepareArticleHtml(article.content, `Illustration — ${article.title}`),
                }}
              />
            ) : (
              <p className="text-sm italic text-slate-400">Le contenu de l&apos;article est vide.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
