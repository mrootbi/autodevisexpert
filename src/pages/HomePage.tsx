import { Suspense, lazy, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import NativeAdCard from '../components/NativeAdCard';
import RecentAnalyses from '../components/RecentAnalyses';
import { useBlogArticles } from '../lib/blogStore';
import { SITE_BASE_URL } from '../lib/siteUrl';
import ArticleCover from '../components/ArticleCover';
import type { BlogArticle } from '../lib/types';

/** Devis tool + car DB + markdown — deferred so the hero paints first on mobile. */
const DevisTool = lazy(() => import('../components/DevisTool'));

export default function HomePage() {
  const toolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollTohash = () => {
      const hash = window.location.hash;
      if (hash === '#outil') {
        toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    scrollTohash();
    const t = window.setTimeout(scrollTohash, 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <SEO
        title="Comparez vos devis auto et évitez les arnaques"
        description="Analyse de devis garage gratuit : comparez le prix garagiste au prix réel marché français et obtenez l'avis d'un expert mécanicien. Sans inscription."
        canonicalPath="/"
        image="/og-default.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'AutoDevis Expert',
          url: `${SITE_BASE_URL}/`,
          description:
            'Comparateur de devis garage gratuit. Analysez votre devis gratuitement, comparez au prix réel et obtenez l\'avis d\'un expert mécanicien.',
          inLanguage: 'fr-FR',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_BASE_URL}/blog?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
          publisher: {
            '@type': 'Organization',
            name: 'AutoDevis Expert',
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_BASE_URL}/og-default.png`,
            },
          },
        }}
      />

      <Hero />

      <section id="outil" ref={toolRef} className="border-t border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="mx-auto mb-8 text-center sm:mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-action-green/10 px-3 py-1 text-xs font-semibold text-action-greenDark">
              Comparateur de devis mécanique
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Analysez votre devis en 2 minutes
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Renseignez votre véhicule, indiquez vos symptômes ou votre devis, on sort le comparatif
              <span className="font-semibold text-trust-700"> Prix Garagiste vs Prix Réel</span>.
            </p>
          </header>
          <Suspense
            fallback={
              <div className="card flex min-h-[240px] items-center justify-center p-8 text-sm text-slate-500" role="status">
                Chargement de l&apos;outil d&apos;analyse…
              </div>
            }
          >
            <DevisTool />
          </Suspense>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <NativeAdCard />
          <RecentAnalyses className="mt-12" title="Dernières analyses" limit={10} />
        </div>
      </section>

      <LastArticles />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-trust-950 text-white" aria-labelledby="hero-title">
      <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(70% 60% at 20% 10%, #2548eb 0%, transparent 60%), radial-gradient(60% 60% at 90% 0%, #16a34a40 0%, transparent 60%)' }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div className="animate-slideUp min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-trust-200 ring-1 ring-white/15">
            Indépendant · Aucun lien commercial
          </span>
          <h1 id="hero-title" className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Votre garage vous a fait un devis. <span className="text-action-green">Le prix est-il honnête ?</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
            On décompose votre devis pièce par pièce, on compare chaque ligne au prix réel marché français,
            et un vrai mécano vous dit si le travail mérite d&apos;être fait. Sans engagement, sans pub mensongère.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="#outil" className="btn-green w-full px-6 sm:w-auto">
              Analyser mon devis
            </a>
            <Link
              to="/blog"
              className="btn-ghost w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
            >
              Lire le blog mécanique
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-6">
            {[
              { v: '−42%', l: 'marge moyenne constatée' },
              { v: '12 500', l: 'devis déjà analysés' },
              { v: '0€', l: "jamais payant pour l'automobiliste" },
            ].map((s) => (
              <div key={s.l} className="min-w-0">
                <dd className="font-display text-2xl font-extrabold text-white sm:text-3xl">{s.v}</dd>
                <dt className="mt-1 text-xs leading-tight text-slate-300">{s.l}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative hidden lg:block animate-fadeIn">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-semibold text-white">Devis — Peugeot 208 (1.2 PureTech)</span>
              <span className="rounded-full bg-action-red/20 px-2 py-0.5 text-xs font-semibold text-action-red">−51%</span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                { l: 'Kit distribution & Pompe à eau', g: 650, r: 320 },
                { l: 'Huile moteur 0W20 (4L)', g: 90, r: 45 },
                { l: "Bougies d'allumage (x3)", g: 85, r: 35 },
                { l: "Main d'œuvre", g: 240, r: 120 },
              ].map((row) => (
                <div key={row.l} className="grid grid-cols-3 items-center gap-2">
                  <span className="text-slate-300">{row.l}</span>
                  <span className="text-right text-white line-through decoration-action-red/60">{row.g}€</span>
                  <span className="text-right font-semibold text-action-green">{row.r}€</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Garagiste</span>
                <span className="font-bold text-white">1 065€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Prix réel</span>
                <span className="font-bold text-action-green">520€</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 rounded-2xl bg-trust-700 p-4 shadow-xl ring-2 ring-white/20">
            <p className="text-xs uppercase tracking-wider text-trust-200">Avis de l'expert</p>
            <p className="mt-1 max-w-[220px] text-sm font-semibold text-white">Attention à la courroie ! Vérifiez les prix réels avant de signer.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LastArticles() {
  const [articles, loading] = useBlogArticles();
  const top3 = articles.slice(0, 3);

  return (
    <section className="border-t border-slate-200 bg-white py-12 sm:py-16" aria-labelledby="last-articles-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div className="min-w-0">
            <h2 id="last-articles-heading" className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Derniers articles
            </h2>
            <p className="mt-2 text-slate-600">Le regard d&apos;un mécano sans filtre sur les pratiques du secteur.</p>
          </div>
          <Link
            to="/blog"
            className="hidden min-h-[44px] items-center text-sm font-semibold text-trust-700 hover:text-trust-800 sm:inline-flex"
          >
            Tout le blog →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : top3.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun article publié.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {top3.map((a) => (
              <ArticleTeaser key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ArticleTeaser({ article }: { article: BlogArticle }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="relative h-40 overflow-hidden bg-slate-100">
        <ArticleCover article={article} className="absolute inset-0 h-full w-full object-cover" />
        {article.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur">
            {article.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-slate-900 group-hover:text-trust-700">
          {article.title}
        </h3>
        <span className="mt-auto pt-4 text-sm font-semibold text-trust-700">Lire l&apos;article →</span>
      </div>
    </Link>
  );
}
