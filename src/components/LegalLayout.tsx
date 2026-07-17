import { ReactNode } from 'react';
import SEO from '../components/SEO';
import NativeAdCard from '../components/NativeAdCard';

interface LegalLayoutProps {
  title: string;
  description: string;
  canonicalPath: string;
  lastUpdate: string;
  children: ReactNode;
}

export default function LegalLayout({ title, description, canonicalPath, lastUpdate, children }: LegalLayoutProps) {
  return (
    <>
      <SEO title={title} description={description} canonicalPath={canonicalPath} image="/og-default.png" />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-trust-600">Page légale</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {lastUpdate}</p>
        </header>
        <div className="prose-article mt-8 min-w-0 overflow-x-clip">{children}</div>
        <NativeAdCard variant="compact" />
      </article>
    </>
  );
}
