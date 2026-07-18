import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, Lightbulb, ShieldCheck } from 'lucide-react';
import SEO from '../components/SEO';
import RecentAnalyses from '../components/RecentAnalyses';
import AdSenseUnit from '../components/AdSenseUnit';
import ShareResultButton from '../components/ShareResultButton';
import PriceComparisonLines from '../components/PriceComparisonLines';
import RecommendationCard from '../components/RecommendationCard';
import NotFoundPage from './NotFoundPage';
import { QuoteReport } from '../lib/types';
import { fetchQuoteReportByPathSlug, quoteReportPath } from '../lib/quoteReports';
import { formatEuro } from '../lib/engine';
import { SITE_BASE_URL } from '../lib/siteUrl';
import { safeMarkdownUrl } from '../lib/sanitize';

export default function DevisAnalysisPage() {
  const { pathSlug } = useParams<{ pathSlug: string }>();
  const [report, setReport] = useState<QuoteReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!pathSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchQuoteReportByPathSlug(pathSlug)
      .then((data) => {
        if (!mounted) return;
        if (!data) {
          setNotFound(true);
          setReport(null);
        } else {
          setReport(data);
          setNotFound(false);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathSlug]);

  if (loading) {
    return <p className="py-24 text-center text-slate-500">Chargement de l&apos;analyse…</p>;
  }

  if (notFound || !report) return <NotFoundPage />;

  const savings = Math.max(0, report.totalGaragiste - report.totalReel);
  const pct =
    report.totalGaragiste > 0 ? Math.round((savings / report.totalGaragiste) * 100) : 0;
  const h1 = report.title || `Analyse Devis ${report.marque} ${report.modele}`;
  const description = `Comparatif anonymisé devis garagiste vs prix réel pour ${report.marque} ${report.modele}${report.moteur ? ` (${report.moteur})` : ''}. Économie estimée : ${formatEuro(savings)}.`;
  const canonicalPath = quoteReportPath(report);
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <SEO
        title={h1}
        description={description}
        canonicalPath={canonicalPath}
        image="/og-default.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: h1,
          datePublished: report.createdAt,
          dateModified: report.createdAt,
          description,
          inLanguage: 'fr-FR',
          image: `${SITE_BASE_URL}/og-default.png`,
          mainEntityOfPage: `${SITE_BASE_URL}${canonicalPath}`,
          about: {
            '@type': 'Vehicle',
            name: `${report.marque} ${report.modele}`.trim(),
            brand: {
              '@type': 'Brand',
              name: report.marque,
            },
            model: report.modele,
            vehicleEngine: report.moteur || undefined,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
              availability: 'https://schema.org/InStock',
              description: 'Analyse de devis AutoDevis Expert — rapport gratuit et anonymisé',
            },
          },
        }}
      />

      <article>
        <header className="border-b border-slate-200 bg-gradient-to-b from-trust-950 to-trust-900 py-10 text-white sm:py-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Retour au comparateur
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-trust-200">
              Rapport anonyme · Programmatic SEO
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {h1}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-200 sm:text-lg">
              Comparatif indicatif des postes de réparation : prix annoncé par un garagiste vs estimation
              du marché français indépendant.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80 sm:gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formatDate(report.createdAt)}
              </span>
              {report.moteur && <span>{report.moteur}</span>}
              {report.kilometrage && <span>{report.kilometrage} km</span>}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3" /> Sans données personnelles
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard label="Devis garagiste" value={formatEuro(report.totalGaragiste)} tone="red" />
            <StatCard label="Prix réel marché" value={formatEuro(report.totalReel)} tone="green" />
            <StatCard
              label="Économie possible"
              value={`${formatEuro(savings)}${pct > 0 ? ` (−${pct}%)` : ''}`}
              tone="trust"
            />
          </div>

          <AdSenseUnit slot="inArticle" placement="results" className="mt-8 rounded-xl" />

          <section className="card mt-8 overflow-hidden" aria-labelledby="detail-postes-heading">
            <header className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 id="detail-postes-heading" className="font-display text-lg font-bold text-slate-900">
                Détail des postes
              </h2>
              <p className="text-sm text-slate-500">
                {report.marque} {report.modele}
                {report.version ? ` ${report.version}` : ''}
              </p>
            </header>
            <PriceComparisonLines
              lines={report.lines}
              totalGaragiste={report.totalGaragiste}
              totalReel={report.totalReel}
            />
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:px-6">
              Estimation indicative basée sur le marché français. Ne remplace pas un diagnostic en atelier.
              Aucun nom, plaque ni coordonnée de garage n&apos;est conservé.
            </p>
          </section>

          <AdSenseUnit slot="inArticle" placement="preVerdict" className="my-8 rounded-xl" />

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-trust-100">
                <Lightbulb className="h-5 w-5 text-trust-700" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-trust-600">Avis de l&apos;expert</p>
                <h2 className="font-display text-xl font-bold text-slate-900">{report.expertAdvice.title}</h2>
              </div>
            </div>
            <div className="prose-article mt-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeMarkdownUrl}>
                {report.expertAdvice.body}
              </ReactMarkdown>
            </div>
            {report.expertAdvice.recommendation && (
              <RecommendationCard recommendation={report.expertAdvice.recommendation} />
            )}
          </div>

          <ShareResultButton sharePath={canonicalPath} className="mt-8" />

          <div className="mt-10 rounded-2xl bg-trust-50 p-6 ring-1 ring-trust-100">
            <p className="font-display text-lg font-bold text-slate-900">Un devis à faire vérifier ?</p>
            <p className="mt-1 text-sm text-slate-600">
              Déposez-le dans le comparateur : analyse anonymisée, sans création de compte.
            </p>
            <Link to="/#outil" className="btn-green mt-4 w-full sm:w-auto">
              Analyser mon devis
            </Link>
          </div>

          <RecentAnalyses
            className="mt-14"
            title="Rapports récents"
            excludePathSlug={report.pathSlug}
          />
        </div>
      </article>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'red' | 'green' | 'trust';
}) {
  const palette = {
    red: 'bg-action-red/10 text-action-redDark',
    green: 'bg-action-green/10 text-action-greenDark',
    trust: 'bg-trust-50 text-trust-700',
  }[tone];
  return (
    <div className={`rounded-2xl p-5 ${palette}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
