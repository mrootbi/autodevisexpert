import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, ArrowRight, ChevronRight, Home } from 'lucide-react';
import SEO, { truncateMetaDescription } from '../components/SEO';
import ArticleCover from '../components/ArticleCover';
import { useBlogArticles } from '../lib/blogStore';
import NativeAdCard from '../components/NativeAdCard';
import AdSenseUnit from '../components/AdSenseUnit';
import NotFoundPage from './NotFoundPage';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';
import { sanitizeHtml } from '../lib/sanitize';
import { SITE_BASE_URL } from '../lib/siteUrl';
import { keywordsToMetaContent, normalizeKeywords } from '../lib/blogKeywords';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [articles, loading] = useBlogArticles();
  const { adsConfig, loading: adsLoading } = useSettings();
  const showSidebarAd = !adsLoading && canRenderAdSlot(adsConfig, 'sidebar');

  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    // Brief remote sync only — avoid a heading-less loading shell for SEO auditors.
    if (loading) {
      return (
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="inline-flex items-center gap-1 hover:text-trust-700">
                  <Home className="h-3.5 w-3.5" /> Accueil
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link to="/blog" className="hover:text-trust-700">
                  Blog
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Chargement de l&apos;article…</h1>
          <p className="mt-3 text-slate-500">Récupération du contenu depuis le serveur.</p>
        </article>
      );
    }
    return <NotFoundPage />;
  }

  const idx = articles.findIndex((a) => a.slug === article.slug);
  const next = articles[(idx + 1) % articles.length];
  const related = articles.filter((a) => a.slug !== article.slug).slice(0, 3);
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const metaDescription = truncateMetaDescription(article.excerpt);
  const articleKeywords = normalizeKeywords(article.keywords);
  const keywordsMeta = keywordsToMetaContent(articleKeywords);

  return (
    <>
      <SEO
        title={article.title}
        description={metaDescription}
        canonicalPath={`/blog/${article.slug}`}
        image={article.coverImage || '/og-default.png'}
        keywords={keywordsMeta || undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          datePublished: article.date,
          dateModified: article.date,
          author: { '@type': 'Person', name: article.author },
          description: metaDescription,
          articleSection: article.category,
          keywords: keywordsMeta || undefined,
          inLanguage: 'fr-FR',
          image: article.coverImage || `${SITE_BASE_URL}/og-default.png`,
          mainEntityOfPage: `${SITE_BASE_URL}/blog/${article.slug}`,
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
            <nav aria-label="Fil d'Ariane" className="text-sm text-white/80">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link to="/" className="inline-flex min-h-[44px] items-center gap-1 hover:text-white">
                    <Home className="h-3.5 w-3.5" /> Accueil
                  </Link>
                </li>
                <li aria-hidden="true" className="text-white/50">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li>
                  <Link to="/blog" className="inline-flex min-h-[44px] items-center hover:text-white">
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true" className="text-white/50">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li className="max-w-[14rem] truncate text-white/90 sm:max-w-xs" aria-current="page">
                  {article.title}
                </li>
              </ol>
            </nav>

            <Link
              to="/blog"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Retour au blog
            </Link>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/80">{article.category}</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-3 text-base text-white/90 sm:text-lg">{article.excerpt}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formatDate(article.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {article.readingTime}
              </span>
              <span>
                par <strong className="font-semibold text-white">{article.author}</strong>
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className={`grid gap-8 ${showSidebarAd ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
            <div className={`min-w-0 ${showSidebarAd ? 'lg:max-w-3xl' : 'mx-auto max-w-3xl'}`}>
              {/* CMS body — must keep real <h2>/<h3> tags for crawlers */}
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
              />

              <NativeAdCard />

              <aside className="mt-10 rounded-2xl bg-trust-50 p-5 ring-1 ring-trust-100 sm:p-6">
                <h2 className="font-display text-lg font-bold text-slate-900">Un devis à analyser ?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Déposez-le dans le comparateur, on sort le détail en deux minutes.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link to="/#outil" className="btn-green w-full sm:w-auto">
                    Analyser mon devis
                  </Link>
                  <Link to="/blog" className="btn-ghost w-full sm:w-auto">
                    Voir tout le blog
                  </Link>
                  <Link to="/contact" className="btn-ghost w-full sm:w-auto">
                    Nous contacter
                  </Link>
                </div>
              </aside>

              {related.length > 0 && (
                <nav className="mt-12 border-t border-slate-200 pt-8" aria-labelledby="related-articles-heading">
                  <h2 id="related-articles-heading" className="font-display text-lg font-bold text-slate-900">
                    Continuer sur AutoDevis Expert
                  </h2>
                  <ul className="mt-4 space-y-3">
                    <li>
                      <Link to="/" className="text-sm font-medium text-trust-700 hover:text-trust-800 hover:underline">
                        Accueil — comparateur de devis garagiste
                      </Link>
                    </li>
                    {related.map((a) => (
                      <li key={a.slug}>
                        <Link
                          to={`/blog/${a.slug}`}
                          className="text-sm font-medium text-trust-700 hover:text-trust-800 hover:underline"
                        >
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {next && next.slug !== article.slug && (
                <div className="mt-12 border-t border-slate-200 pt-8">
                  <p className="text-sm text-slate-500">Article suivant</p>
                  <Link
                    to={`/blog/${next.slug}`}
                    className="mt-2 block font-display text-lg font-bold text-trust-700 hover:text-trust-800"
                  >
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
