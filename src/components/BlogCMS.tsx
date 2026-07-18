import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { Plus, Pencil, Trash2, X, Save, Eye, FileText, CheckCircle2, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { BlogArticle } from '../lib/types';
import { getBlogArticles, createArticle, updateArticle, deleteArticle, slugify } from '../lib/blogStore';
import { readCoverImageFile } from '../lib/blogCover';
import { uploadBlogImage } from '../lib/blogImages';
import { generateSlugWithAi } from '../lib/blogSlug';
import { generateKeywordsWithAi, normalizeKeywords } from '../lib/blogKeywords';
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

type ArticleDraft = Omit<BlogArticle, 'date'> & { date?: string };

const emptyDraft: ArticleDraft = {
  slug: '',
  title: '',
  excerpt: '',
  category: 'Mécanique',
  readingTime: '5 min',
  author: 'Régis M., ex-garagiste',
  cover: COVER_OPTIONS[0],
  content: '',
  keywords: [],
};

function draftToPreviewArticle(draft: ArticleDraft): BlogArticle {
  const slug = slugify(draft.slug || draft.title || 'apercu') || 'apercu';
  const date = draft.date || new Date().toISOString();
  return { ...draft, slug, date };
}

export default function BlogCMS() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [editing, setEditing] = useState<BlogArticle | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [slugLoading, setSlugLoading] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setArticles(getBlogArticles());

  useEffect(() => { refresh(); }, []);

  const startCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
    setCoverError(null);
    setSlugError(null);
    setSlugManual(false);
    setKeywordInput('');
    setKeywordsError(null);
  };

  const startEdit = (a: BlogArticle) => {
    setDraft({ ...a, keywords: normalizeKeywords(a.keywords) });
    setEditing(a);
    setCreating(true);
    setCoverError(null);
    setSlugError(null);
    setSlugManual(true);
    setKeywordInput('');
    setKeywordsError(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setDraft(emptyDraft);
    setPreviewOpen(false);
    setCoverError(null);
    setSlugError(null);
    setSlugManual(false);
    setKeywordInput('');
    setKeywordsError(null);
  };

  const resolveSlug = () => slugify(draft.slug || draft.title) || 'article';
  const draftKeywords = normalizeKeywords(draft.keywords);

  const save = () => {
    if (!draft.title.trim()) return;
    const slug = resolveSlug();
    const keywords = normalizeKeywords([...draftKeywords, ...normalizeKeywords(keywordInput)]);
    const payload = { ...draft, slug, keywords };
    if (editing) {
      updateArticle(editing.slug, payload);
    } else {
      createArticle(payload);
    }
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    cancel();
  };

  const addKeyword = (raw: string) => {
    const next = normalizeKeywords([...draftKeywords, raw]);
    if (next.length === draftKeywords.length) return;
    setDraft((prev) => ({ ...prev, keywords: next }));
    setKeywordInput('');
  };

  const removeKeyword = (tag: string) => {
    setDraft((prev) => ({
      ...prev,
      keywords: normalizeKeywords(prev.keywords).filter((k) => k.toLowerCase() !== tag.toLowerCase()),
    }));
  };

  const onKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (keywordInput.trim()) addKeyword(keywordInput);
      return;
    }
    if (e.key === 'Backspace' && !keywordInput && draftKeywords.length > 0) {
      removeKeyword(draftKeywords[draftKeywords.length - 1]);
    }
  };

  const runAiKeywords = async () => {
    if (!draft.title.trim()) {
      setKeywordsError('Saisissez d’abord un titre (idéalement aussi le contenu).');
      return;
    }
    setKeywordsLoading(true);
    setKeywordsError(null);
    try {
      const suggested = await generateKeywordsWithAi({
        title: draft.title,
        excerpt: draft.excerpt,
        content: draft.content,
        category: draft.category,
      });
      if (suggested.length === 0) {
        setKeywordsError('Aucune suggestion reçue. Réessayez ou saisissez-les manuellement.');
        return;
      }
      setDraft((prev) => ({
        ...prev,
        keywords: normalizeKeywords([...(prev.keywords ?? []), ...suggested]),
      }));
    } catch (err) {
      setKeywordsError(err instanceof Error ? err.message : 'Impossible de suggérer les mots-clés.');
    } finally {
      setKeywordsLoading(false);
    }
  };

  const runAiSlug = async () => {
    if (!draft.title.trim()) {
      setSlugError('Saisissez d’abord un titre.');
      return;
    }
    setSlugLoading(true);
    setSlugError(null);
    try {
      const slug = await generateSlugWithAi(draft.title);
      setDraft((prev) => ({ ...prev, slug }));
      setSlugManual(true);
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : 'Impossible de générer le slug.');
    } finally {
      setSlugLoading(false);
    }
  };

  const handleTitleBlur = () => {
    if (slugManual || draft.slug.trim() || !draft.title.trim()) return;
    setDraft((prev) => ({ ...prev, slug: slugify(prev.title) }));
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="card space-y-6 p-5 sm:p-6">
              <div>
                <label className="label-field">Titre *</label>
                <input
                  className="input-field text-base font-semibold"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  onBlur={handleTitleBlur}
                  placeholder="Ex : Arnaque garagiste : les pièces gonflées"
                />
              </div>

              <div>
                <label className="label-field">Slug (URL de l&apos;article)</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-slate-400">/blog/</span>
                    <input
                      className="input-field pl-[3.25rem] font-mono text-sm"
                      value={draft.slug}
                      onChange={(e) => {
                        setSlugManual(true);
                        setDraft({ ...draft, slug: e.target.value });
                      }}
                      onBlur={() => setDraft((prev) => ({ ...prev, slug: slugify(prev.slug) || prev.slug }))}
                      placeholder="mon-titre-article"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void runAiSlug()}
                    disabled={slugLoading || !draft.title.trim()}
                    className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 text-xs"
                    title="Générer un slug SEO via Gemini"
                  >
                    {slugLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Générer par IA
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Aperçu : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">/blog/{resolveSlug()}</code>
                </p>
                {slugError && <p className="mt-1.5 text-xs text-action-redDark">{slugError}</p>}
              </div>

              <div>
                <label className="label-field">Mots-clés SEO (Tags)</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 focus-within:border-trust-500 focus-within:ring-4 focus-within:ring-trust-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {draftKeywords.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-trust-50 px-2.5 py-1 text-xs font-medium text-trust-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeKeyword(tag)}
                            className="rounded-full p-0.5 text-trust-600 hover:bg-trust-100 hover:text-trust-900"
                            title="Retirer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={onKeywordKeyDown}
                        onBlur={() => {
                          if (keywordInput.trim()) addKeyword(keywordInput);
                        }}
                        placeholder={draftKeywords.length ? 'Ajouter…' : 'Ex : devis climatisation, prix recharge clim'}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runAiKeywords()}
                    disabled={keywordsLoading || !draft.title.trim()}
                    className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 text-xs"
                    title="Suggérer des mots-clés SEO via Gemini"
                  >
                    {keywordsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Suggérer les Keywords par IA
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Entrée ou virgule pour ajouter un tag. Injectés en <code className="font-mono">&lt;meta name=&quot;keywords&quot;&gt;</code> sur l&apos;article public.
                </p>
                {keywordsError && <p className="mt-1.5 text-xs text-action-redDark">{keywordsError}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-field">Catégorie</label>
                  <input className="input-field" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Auteur</label>
                  <input className="input-field" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Temps de lecture</label>
                  <input className="input-field" value={draft.readingTime} onChange={(e) => setDraft({ ...draft, readingTime: e.target.value })} placeholder="5 min" />
                </div>
              </div>

              <div>
                <label className="label-field">Extrait (meta description)</label>
                <textarea
                  className="input-field min-h-[88px] resize-y"
                  value={draft.excerpt}
                  onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                  placeholder="Résumé court affiché dans la liste et les réseaux sociaux."
                />
              </div>
            </div>

            <aside className="card space-y-5 p-5 sm:p-6 lg:sticky lg:top-6 lg:self-start">
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
                    className="btn-ghost flex-1 py-2 text-xs"
                  >
                    <ImagePlus className="h-4 w-4" /> Choisir une image
                  </button>
                  {draft.coverImage && (
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
            </aside>
          </div>

          <div className="card space-y-3 p-5 sm:p-6">
            <label className="label-field">Contenu</label>
            <RichTextEditor
              value={draft.content}
              onChange={(html) => setDraft({ ...draft, content: html })}
              onImageUpload={uploadBlogImage}
              placeholder="Rédigez votre article — titres, listes, liens… Collez une image avec Ctrl+V."
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
