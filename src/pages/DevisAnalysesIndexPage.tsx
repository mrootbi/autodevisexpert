import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import RecentAnalyses from '../components/RecentAnalyses';
import { SITE_BASE_URL } from '../lib/siteUrl';

export default function DevisAnalysesIndexPage() {
  return (
    <>
      <SEO
        title="Dernières analyses de devis auto"
        description="Consultez les derniers rapports anonymes AutoDevis Expert : comparatif prix garagiste vs prix réel par véhicule."
        canonicalPath="/devis-analyses"
        image="/og-default.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Dernières analyses de devis auto — AutoDevis Expert',
          description:
            'Rapports anonymes AutoDevis Expert : comparatif prix garagiste vs prix réel par véhicule.',
          url: `${SITE_BASE_URL}/devis-analyses`,
          inLanguage: 'fr-FR',
          isPartOf: {
            '@type': 'WebSite',
            name: 'AutoDevis Expert',
            url: `${SITE_BASE_URL}/`,
          },
        }}
      />
      <section className="bg-gradient-to-b from-trust-950 to-trust-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/30">
            Rapports anonymes
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Dernières analyses
          </h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            Chaque analyse réussie devient une page publique nettoyée (sans plaque, nom ni garage)
            pour comparer les prix du marché français.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <RecentAnalyses
          title="Rapports récents"
          subtitle="Les 10 dernières analyses publiées, triées du plus récent au plus ancien."
          limit={10}
        />
        <div className="mt-10 rounded-2xl bg-trust-50 p-6 ring-1 ring-trust-100">
          <p className="font-display text-lg font-bold text-slate-900">Vous avez un devis à vérifier ?</p>
          <p className="mt-1 text-sm text-slate-600">
            Lancez une analyse : le rapport anonymisé pourra rejoindre cette liste.
          </p>
          <Link to="/#outil" className="btn-green mt-4 w-full sm:w-auto">
            Analyser mon devis
          </Link>
        </div>
      </section>
    </>
  );
}
