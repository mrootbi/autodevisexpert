import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import ArticleCover from '../components/ArticleCover';
import { useBlogArticles } from '../lib/blogStore';
import NativeAdCard from '../components/NativeAdCard';
import { SITE_BASE_URL } from '../lib/siteUrl';

export default function BlogPage() {
  const [articles, loading] = useBlogArticles();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const filtered = query
    ? articles.filter((a) => {
        const haystack = [a.title, a.excerpt, a.category, a.slug, ...(a.keywords || [])]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
    : articles;

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <SEO
        title="Blog mécanique — arnaques devis et conseils garage"
        description="Le blog d'un vrai mécano sans filtre : arnaques, marges gonflées, refroidissement, G12+ vs G13, devis concessionnaire vs indépendant."
        canonicalPath="/blog"
        image="/og-default.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Blog AutoDevis Expert',
          inLanguage: 'fr-FR',
          url: `${SITE_BASE_URL}/blog`,
          image: `${SITE_BASE_URL}/og-default.png`,
          blogPost: articles.map((a) => ({
            '@type': 'BlogPosting',
            headline: a.title,
            datePublished: a.date,
            author: { '@type': 'Person', name: a.author },
            description: a.excerpt,
            url: `${SITE_BASE_URL}/blog/${a.slug}`,
          })),
        }}
      />
      <header className="bg-gradient-to-b from-trust-950 to-trust-900 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-trust-200 ring-1 ring-white/15">
            Mécanique sans filtre
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Blog mécanique AutoDevis Expert
          </h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            Le regard d&apos;un mécano sur le métier : marges, pièces, devis, refroidissement…
            Tout ce qu&apos;on aurait aimé savoir avant de signer nos premières factures.
          </p>
          {query && (
            <p className="mt-4 text-sm text-trust-200">
              Résultats pour « {searchParams.get('q')} » — {filtered.length} article
              {filtered.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8" aria-label="Liste des articles">
        {loading ? (
          <p className="py-12 text-center text-slate-500">Chargement des articles…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            {query
              ? `Aucun article ne correspond à « ${searchParams.get('q')} ».`
              : 'Aucun article publié pour le moment.'}
          </p>
        ) : (
          <>
            {featured && (
              <article>
                <Link to={`/blog/${featured.slug}`} className="card group mb-8 flex flex-col overflow-hidden md:flex-row">
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-2xl md:w-[40%] md:rounded-l-2xl md:rounded-tr-none">
                    <ArticleCover article={featured} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-trust-950/70 to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                      À la une
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-8 md:w-[60%]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-trust-600">{featured.category}</span>
                    <h2 className="mt-2 font-display text-xl font-bold leading-snug text-slate-900 group-hover:text-trust-700 sm:text-2xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">{featured.excerpt}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(featured.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readingTime}</span>
                      <span>· par {featured.author}</span>
                    </div>
                  </div>
                </Link>
              </article>
            )}

            <NativeAdCard />

            {rest.length > 0 && (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {rest.map((a) => (
                  <article key={a.slug}>
                    <Link
                      to={`/blog/${a.slug}`}
                      className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-cardHover sm:flex-row"
                    >
                      <div className="h-36 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-32">
                        <ArticleCover article={a} className="h-full min-h-[9rem] w-full sm:min-h-full" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-trust-600">{a.category}</span>
                        <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-slate-900 group-hover:text-trust-700 sm:text-lg">
                          {a.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{a.excerpt}</p>
                        <div className="mt-4 flex min-h-[44px] items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.readingTime}</span>
                          <span className="flex items-center gap-1 font-semibold text-trust-700 transition-all group-hover:gap-2">
                            Lire <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
