import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  return (
    <>
      <SEO
        title="Page introuvable (404)"
        description="La page demandée n'existe pas ou a été déplacée."
        canonicalPath="/404"
        noIndex
      />
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-trust-100 text-trust-700">
          <Compass className="h-8 w-8" />
        </span>
        <p className="mt-6 font-display text-6xl font-extrabold text-slate-900">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Cette page a pris la tangente</h1>
        <p className="mt-3 text-slate-600">On a cherché partout mais la page demandée n'est plus là. Retournons à l'atelier.</p>
        <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link to="/" className="btn-primary w-full sm:w-auto">Retour à l&apos;accueil</Link>
          <Link to="/blog" className="btn-ghost w-full sm:w-auto">Voir le blog</Link>
        </div>
      </section>
    </>
  );
}
