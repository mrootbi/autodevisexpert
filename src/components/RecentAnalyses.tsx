import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Car, TrendingDown } from 'lucide-react';
import { QuoteReport } from '../lib/types';
import { fetchRecentQuoteReports, quoteReportPath } from '../lib/quoteReports';
import { formatEuro } from '../lib/engine';

interface RecentAnalysesProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
  /** Exclude the report currently being viewed. */
  excludePathSlug?: string;
}

export default function RecentAnalyses({
  title = 'Dernières analyses',
  subtitle = 'Rapports anonymes générés par le comparateur — prix garagiste vs prix réel.',
  limit = 5,
  className = '',
  excludePathSlug,
}: RecentAnalysesProps) {
  const [reports, setReports] = useState<QuoteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchRecentQuoteReports(excludePathSlug ? limit + 3 : limit)
      .then((list) => {
        if (!mounted) return;
        const filtered = excludePathSlug
          ? list.filter((r) => r.pathSlug !== excludePathSlug).slice(0, limit)
          : list.slice(0, limit);
        setReports(filtered);
      })
      .catch((err) => {
        console.warn('Failed to fetch recent quote reports', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [limit, excludePathSlug]);

  if (!loading && reports.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p>
        </div>
        <Link to="/#outil" className="hidden text-sm font-semibold text-trust-700 hover:text-trust-800 sm:inline-flex">
          Analyser mon devis →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement des rapports…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {reports.map((report) => {
            const savings = Math.max(0, report.totalGaragiste - report.totalReel);
            const pct =
              report.totalGaragiste > 0
                ? Math.round((savings / report.totalGaragiste) * 100)
                : 0;
            return (
              <li key={report.id}>
                <Link
                  to={quoteReportPath(report)}
                  className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-cardHover sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-trust-50 text-trust-700">
                      <Car className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold leading-snug text-slate-900 group-hover:text-trust-700">
                        {report.title}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">
                          {[report.marque, report.modele, report.moteur].filter(Boolean).join(' · ')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {report.lines.length} poste{report.lines.length > 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        <span className="line-through">{formatEuro(report.totalGaragiste)}</span>
                        {' → '}
                        <span className="font-semibold text-action-greenDark">{formatEuro(report.totalReel)}</span>
                      </p>
                      {pct > 0 && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-action-redDark">
                          <TrendingDown className="h-3 w-3" /> −{pct}% possible
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-trust-600 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
