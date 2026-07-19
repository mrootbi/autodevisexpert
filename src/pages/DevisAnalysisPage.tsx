import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, Lightbulb, ShieldCheck, Printer } from 'lucide-react';
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
import { reportMarkdownHeadingComponents, truncateHeading } from '../lib/reportMarkdown';

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
      .catch((err) => {
        console.warn('Failed to fetch quote report', err);
        if (mounted) {
          setNotFound(true);
          setReport(null);
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
  const vehicleLabel = `${report.marque} ${report.modele}`.trim();
  const fullHeadline =
    report.title || `Analyse Devis Garage : ${vehicleLabel}`;
  const h1 = truncateHeading(fullHeadline, 70);
  const description = [
    `Rapport détaillé et analyse technique du devis pour ${vehicleLabel}`,
    report.moteur ? `(${report.moteur})` : '',
    report.kilometrage ? `à ${report.kilometrage} km` : '',
    `— postes, estimations marché et avis expert AutoDevis.`,
    savings > 0 ? `Économie indicative estimée : ${formatEuro(savings)}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const seoTitle = truncateHeading(`Analyse devis ${vehicleLabel}`, 55);
  const canonicalPath = quoteReportPath(report);
  const published = report.createdAt;
  const imageUrl = `${SITE_BASE_URL}/og-default.png`;
  const adviceTitleRaw = (report.expertAdvice.title || '').trim();
  const adviceTitleNormalized = adviceTitleRaw.toLowerCase();
  const h1Normalized = fullHeadline.trim().toLowerCase();
  const expertHeading =
    !adviceTitleRaw || adviceTitleNormalized === h1Normalized
      ? `Avis expert mécanicien — ${vehicleLabel}`
      : `Avis expert : ${truncateHeading(adviceTitleRaw, 80)}`;
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <SEO
        title={seoTitle}
        description={description}
        canonicalPath={canonicalPath}
        image="/og-default.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: h1,
          description,
          image: imageUrl,
          datePublished: published,
          dateModified: published,
          inLanguage: 'fr-FR',
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_BASE_URL}${canonicalPath}`,
          },
          author: {
            '@type': 'Organization',
            name: 'AutoDevis Expert',
            url: SITE_BASE_URL,
          },
          publisher: {
            '@type': 'Organization',
            name: 'AutoDevis Expert',
            url: SITE_BASE_URL,
            logo: {
              '@type': 'ImageObject',
              url: imageUrl,
            },
          },
        }}
      />

      <article className="print:report-print">
        <header className="border-b border-slate-200 bg-gradient-to-b from-trust-950 to-trust-900 py-10 text-white sm:py-14 print:border-b-2 print:border-trust-700 print:bg-none print:bg-white print:py-0 print:pb-6 print:text-slate-900">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <Link
                to="/"
                className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Retour au comparateur
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:border-white/40 hover:bg-white/20 active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" />
                Imprimer / Sauvegarder en PDF
              </button>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-trust-200 print:mt-0 print:text-trust-700">
              Rapport anonyme · Programmatic SEO
            </p>
            <h1
              className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl print:text-slate-900"
              title={fullHeadline !== h1 ? fullHeadline : undefined}
            >
              {h1}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-200 sm:text-lg print:text-slate-600">
              Comparatif indicatif des postes de réparation pour {vehicleLabel} : prix annoncé par un
              garagiste vs estimation du marché français indépendant.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80 sm:gap-4 print:text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formatDate(report.createdAt)}
              </span>
              {report.moteur && <span>{report.moteur}</span>}
              {report.kilometrage && <span>{report.kilometrage} km</span>}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold print:bg-trust-50 print:text-trust-700">
                <ShieldCheck className="h-3 w-3" /> Sans données personnelles
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 print:max-w-full print:px-0 print:py-6">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 print:break-inside-avoid">
            <StatCard label="Devis garagiste" value={formatEuro(report.totalGaragiste)} tone="red" />
            <StatCard label="Prix réel marché" value={formatEuro(report.totalReel)} tone="green" />
            <StatCard
              label="Économie possible"
              value={`${formatEuro(savings)}${pct > 0 ? ` (−${pct}%)` : ''}`}
              tone="trust"
            />
          </div>

          <AdSenseUnit slot="inArticle" placement="results" className="mt-8 rounded-xl" />

          <section
            className="card mt-8 overflow-hidden print:mt-6 print:break-inside-avoid print:border print:border-slate-300 print:shadow-none"
            aria-labelledby="detail-postes-heading"
          >
            <header className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 id="detail-postes-heading" className="font-display text-lg font-bold text-slate-900">
                Détail des postes — {vehicleLabel}
              </h2>
              <p className="text-sm text-slate-500">
                Comparatif ligne à ligne
                {report.version ? ` · ${report.version}` : ''}
                {report.moteur ? ` · ${report.moteur}` : ''}
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

          <section
            className="card p-6 sm:p-8 print:mt-6 print:break-inside-avoid print:border print:border-slate-300 print:p-0 print:shadow-none"
            aria-labelledby="expert-advice-heading"
          >
            <div className="flex items-center gap-3 print:p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-trust-100 print:hidden">
                <Lightbulb className="h-5 w-5 text-trust-700" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-trust-600">
                  Analyse technique AutoDevis
                </p>
                <h2 id="expert-advice-heading" className="font-display text-xl font-bold text-slate-900">
                  {expertHeading}
                </h2>
              </div>
            </div>
            <div className="prose-article mt-5 print:px-5 print:pb-5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                urlTransform={safeMarkdownUrl}
                components={reportMarkdownHeadingComponents}
              >
                {report.expertAdvice.body}
              </ReactMarkdown>
            </div>
            {report.expertAdvice.recommendation && (
              <RecommendationCard
                recommendation={report.expertAdvice.recommendation}
                className="print:mx-5 print:mb-5"
              />
            )}
          </section>

          <ShareResultButton sharePath={canonicalPath} className="mt-8 print:hidden" />

          <div className="mt-10 rounded-2xl bg-trust-50 p-6 ring-1 ring-trust-100 print:hidden">
            <p className="font-display text-lg font-bold text-slate-900">Un devis à faire vérifier ?</p>
            <p className="mt-1 text-sm text-slate-600">
              Déposez-le dans le comparateur : analyse anonymisée, sans création de compte.
            </p>
            <Link to="/#outil" className="btn-green mt-4 w-full sm:w-auto">
              Analyser mon devis
            </Link>
          </div>

          <RecentAnalyses
            className="mt-14 print:hidden"
            title={`Autres analyses proches de ${vehicleLabel}`}
            subtitle="Rapports anonymes du comparateur — pour comparer d'autres devis similaires."
            excludePathSlug={report.pathSlug}
          />

          <p className="mt-10 hidden text-xs text-slate-400 print:block">
            {SITE_BASE_URL.replace('https://', '')}{canonicalPath} · Généré le{' '}
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ·
            Estimation indicative, ne remplace pas un diagnostic en atelier.
          </p>
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
