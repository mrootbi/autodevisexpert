import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Save, Eye, FileText, CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';
import { BlogArticle } from '../lib/types';
import { getBlogArticles, createArticle, updateArticle, deleteArticle, slugify } from '../lib/blogStore';
import { readCoverImageFile } from '../lib/blogCover';
import RichTextEditor from './RichTextEditor';
import BlogArticlePreview from './BlogArticlePreview';
import ArticleCover from './ArticleCover';

const COVER_OPTIONS = [
  'from-trust-700 to-trust-500',
  'from-trust-700 to-action-green',
  'from-trust-700 to-trust-900',
  'from-action-green to-trust-700',
  'from-slate-700 to-trust-700',
];

const emptyDraft: Omit<BlogArticle, 'slug' | 'date'> = {
  title: '',
  excerpt: '',
  category: 'Mécanique',
  readingTime: '5 min',
  author: 'Régis M., ex-garagiste',
  cover: COVER_OPTIONS[0],
  content: '',
};

function draftToPreviewArticle(draft: typeof emptyDraft | BlogArticle): BlogArticle {
  const slug = 'slug' in draft && draft.slug ? draft.slug : slugify(draft.title || 'apercu');
  const date = 'date' in draft && draft.date ? draft.date : new Date().toISOString();
  return { ...draft, slug, date };
}

export default function BlogCMS() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [editing, setEditing] = useState<BlogArticle | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<typeof emptyDraft | BlogArticle>(emptyDraft);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setArticles(getBlogArticles());

  useEffect(() => { refresh(); }, []);

  const startCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
    setCoverError(null);
  };

  const startEdit = (a: BlogArticle) => {
    setDraft(a);
    setEditing(a);
    setCreating(true);
    setCoverError(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setDraft(emptyDraft);
    setPreviewOpen(false);
    setCoverError(null);
  };

  const save = () => {
    if (!draft.title.trim()) return;
    if (editing) {
      updateArticle(editing.slug, { ...draft, slug: slugify(draft.title) });
    } else {
      createArticle(draft);
    }
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    cancel();
  };

  const remove = (slug: string) => {
    if (!confirm('Supprimer cet article ? Cette action est irréversible.')) return;
    deleteArticle(slug);
    refresh();
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCoverLoading(true);
    setCoverError(null);
    try {
      const dataUrl = await readCoverImageFile(file);
      setDraft({ ...draft, coverImage: dataUrl });
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Erreur lors du chargement.');
    } finally {
      setCoverLoading(false);
    }
  };

  const formatDate = (d: string | null | undefined): string => {
    if (!d || !String(d).trim()) return '—';
    const raw = String(d).trim();

    // Prefer YYYY-MM-DD (stored by createArticle) to avoid timezone / locale pitfalls.
    const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (isoDay) {
      const [, y, m, day] = isoDay;
      return `${day}/${m}/${y}`;
    }

    // DD/MM/YYYY already formatted
    const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (fr) {
      const [, day, m, y] = fr;
      return `${day.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (creating) {
    const previewArticle = draftToPreviewArticle(draft);

    return (
      <>
        <div className="space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900">{editing ? 'Modifier l\'article' : 'Nouvel article'}</h1>
              <p className="text-sm text-slate-500">Rédigez, prévisualisez et publiez — visible immédiatement sur le site.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn-ghost">
                <Eye className="h-4 w-4" /> Aperçu
              </button>
              <button type="button" onClick={cancel} className="btn-ghost">
                <X className="h-4 w-4" /> Annuler
              </button>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="card space-y-5 p-5 sm:p-6">
              <div>
                <label className="label-field">Titre *</label>
                <input
                  className="input-field text-base font-semibold"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ex : Arnaque garagiste : les pièces gonflées"
                />
                {draft.title && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Slug : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">/blog/{slugify(draft.title)}</code>
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-field">Catégorie</label>
                  <input className="input-field" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Auteur</label>
                  <input className="input-field" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Temps de lecture</label>
                  <input className="input-field" value={draft.readingTime} onChange={(e) => setDraft({ ...draft, readingTime: e.target.value })} placeholder="5 min" />
                </div>
              </div>

              <div>
                <label className="label-field">Extrait (meta description)</label>
                <textarea
                  className="input-field min-h-[72px] resize-y"
                  value={draft.excerpt}
                  onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                  placeholder="Résumé court affiché dans la liste et les réseaux sociaux."
                />
              </div>
            </div>

            <div className="card space-y-4 p-5 sm:p-6">
              <div>
                <label className="label-field">Image de couverture</label>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="relative aspect-[16/10] bg-slate-100">
                    <ArticleCover article={draft} className="absolute inset-0 h-full w-full" />
                    {coverLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-6 w-6 animate-spin text-trust-600" />
                      </div>
                    )}
                  </div>
                </div>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={coverLoading}
                    onClick={() => coverInputRef.current?.click()}
                    className="btn-ghost flex-1 py-2 text-xs sm:flex-none"
                  >
                    <ImagePlus className="h-4 w-4" /> Choisir une image
                  </button>
                  {'coverImage' in draft && draft.coverImage && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, coverImage: undefined })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-action-red/30 hover:text-action-redDark"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                {coverError && <p className="mt-2 text-xs text-action-redDark">{coverError}</p>}
              </div>

              <div>
                <label className="label-field">Dégradé de secours</label>
                <select className="input-field text-xs" value={draft.cover} onChange={(e) => setDraft({ ...draft, cover: e.target.value })}>
                  {COVER_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.replace(/from-|to-/g, '').replace(/-/g, ' ')}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-400">Utilisé si aucune image n&apos;est téléversée.</p>
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <label className="label-field">Contenu</label>
            <RichTextEditor
              value={draft.content}
              onChange={(html) => setDraft({ ...draft, content: html })}
              placeholder="Rédigez votre article — titres, listes, liens…"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={!draft.title.trim()} className="btn-green">
              <Save className="h-4 w-4" /> {editing ? 'Mettre à jour' : 'Publier'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-action-greenDark">
                <CheckCircle2 className="h-4 w-4" /> Enregistré
              </span>
            )}
          </div>
        </div>

        <BlogArticlePreview open={previewOpen} article={previewArticle} onClose={() => setPreviewOpen(false)} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Blog — Gestion des articles</h1>
          <p className="text-sm text-slate-500">{articles.length} article(s) publié(s). Les modifications sont visibles immédiatement sur le site public.</p>
        </div>
        <button onClick={startCreate} className="btn-green"><Plus className="h-4 w-4" /> Nouvel article</button>
      </header>

      {articles.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aucun article. Créez le premier.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.slug} className="card flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display font-bold text-slate-900">{a.title}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{formatDate(a.date)}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <a href={`/#/blog/${a.slug}`} onClick={(e) => { e.preventDefault(); window.open(`#/blog/${a.slug}`, '_blank'); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-trust-700" title="Aperçu public">
                  <Eye className="h-4 w-4" />
                </a>
                <button onClick={() => startEdit(a)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-trust-700" title="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(a.slug)} className="rounded-lg p-2 text-slate-500 hover:bg-action-red/10 hover:text-action-redDark" title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
