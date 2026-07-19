import { Link } from 'react-router-dom';
import { Wrench, Mail, Shield, FileText, BookOpen, Facebook } from 'lucide-react';
import { SOCIAL_PROFILES } from '../lib/socialMeta';

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="https://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-trust-950 text-slate-300 print:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold text-white">
              AutoDevis <span className="text-trust-300">Expert</span>
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Le comparateur de devis mécanique qui remet le client au centre. On décortique le prix
            annoncé, on compare au prix réel, et on vous donne l'avis d'un vrai mécano.
          </p>
          <nav aria-label="Réseaux sociaux" className="mt-5">
            <ul className="flex flex-wrap items-center gap-3">
              <li>
                <a
                  href={SOCIAL_PROFILES.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <Facebook className="h-4 w-4" aria-hidden="true" />
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_PROFILES.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <XIcon className="h-4 w-4" />
                  X / Twitter
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Outil & Blog
          </div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Accueil</Link></li>
            <li><Link to="/#outil" className="hover:text-white">Analyser un devis</Link></li>
            <li><Link to="/devis-analyses" className="hover:text-white">Dernières analyses</Link></li>
            <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <Shield className="h-4 w-4" aria-hidden="true" /> Légal
          </div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/mentions-legales" className="hover:text-white">Mentions Légales</Link></li>
            <li><Link to="/politique-de-confidentialite" className="hover:text-white">Politique de Confidentialité</Link></li>
            <li><Link to="/cgu" className="hover:text-white">CGU</Link></li>
          </ul>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <FileText className="h-4 w-4" aria-hidden="true" /> Infos
          </div>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>Comparateur indépendant</li>
            <li>Prix basés sur le marché français</li>
            <li>Aucun lien commercial avec un garage</li>
          </ul>
          <a href="mailto:contact@autodevisexpert.com" className="mt-4 inline-flex items-center gap-2 text-sm text-trust-300 hover:text-white">
            <Mail className="h-4 w-4" /> contact@autodevisexpert.com
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} AutoDevis Expert — Tous droits réservés.</p>
          <p>Conçu pour les automobilistes français, par des passionnés de mécanique.</p>
        </div>
      </div>
    </footer>
  );
}
