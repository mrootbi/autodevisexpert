import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import ArticleCover from '../components/ArticleCover';
import { useBlogArticles } from '../lib/blogStore';
import NativeAdCard from '../components/NativeAdCard';
import AdSenseUnit from '../components/AdSenseUnit';
import NotFoundPage from './NotFoundPage';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';
import { sanitizeHtml } from '../lib/sanitize';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [articles, loading] = useBlogArticles();
  const { adsConfig, loading: adsLoading } = useSettings();
  const showSidebarAd = !adsLoading && canRenderAdSlot(adsConfig, 'sidebar');

  if (loading) {
    return <p className="py-24 text-center text-slate-500">Chargement de l'article…</p>;
  }

  const article = articles.find((a) => a.slug === slug);
  if (!article) return <NotFoundPage />;

  const idx = articles.findIndex((a) => a.slug === article.slug);
  const next = articles[(idx + 1) % articles.length];
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <SEO
        title={article.title}
        description={article.excerpt}
        canonicalPath={`/blog/${article.slug}`}
        image={article.coverImage || '/og-default.png'}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          datePublished: article.date,
          dateModified: article.date,
          author: { '@type': 'Person', name: article.author },
          description: article.excerpt,
          articleSection: article.category,
          inLanguage: 'fr-FR',
          image: article.coverImage || 'https://autodevisexpert.com/og-default.png',
          mainEntityOfPage: `https://autodevisexpert.com/blog/${article.slug}`,
        }}
      />
      <article>
        <header className="relative overflow-hidden py-12 text-white sm:py-16">
          <div className="absolute inset-0">
            <ArticleCover
              article={article}
              className="h-full w-full"
              alt={`Analyse de devis garage gratuit — ${article.title}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-trust-950/90 via-trust-900/55 to-trust-800/35" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Link
              to="/blog"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Retour au blog
            </Link>
            <span className="mt-5 block text-xs font-semibold uppercase tracking-wider text-white/80">{article.category}</span>
            <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-3 text-base text-white/90 sm:text-lg">{article.excerpt}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(article.date)}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {article.readingTime}</span>
              <span>par <strong className="font-semibold text-white">{article.author}</strong></span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className={`grid gap-8 ${showSidebarAd ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
            <div className={`min-w-0 ${showSidebarAd ? 'lg:max-w-3xl' : 'mx-auto max-w-3xl'}`}>
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
              />

              <NativeAdCard />

              <aside className="mt-10 rounded-2xl bg-trust-50 p-5 ring-1 ring-trust-100 sm:p-6">
                <h2 className="font-display text-lg font-bold text-slate-900">Un devis à analyser ?</h2>
                <p className="mt-1 text-sm text-slate-600">Déposez-le dans le comparateur, on sort le détail en deux minutes.</p>
                <Link to="/#outil" className="btn-green mt-4 w-full sm:w-auto">Analyser mon devis</Link>
              </aside>

              {next && next.slug !== article.slug && (
                <div className="mt-12 border-t border-slate-200 pt-8">
                  <p className="text-sm text-slate-500">Continuer la lecture</p>
                  <Link to={`/blog/${next.slug}`} className="mt-2 block font-display text-lg font-bold text-trust-700 hover:text-trust-800">
                    {next.title}
                    <ArrowRight className="ml-2 inline h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {showSidebarAd && (
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <AdSenseUnit slot="sidebar" placement="sidebar" className="rounded-xl" />
                </div>
              </aside>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
