import { Link } from 'react-router-dom';
import { Wrench, Mail, Shield, FileText, BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-trust-950 text-slate-300">
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
        </div>

        <div>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <BookOpen className="h-4 w-4" /> Outil & Blog
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/#outil" className="hover:text-white">Analyser un devis</Link></li>
            <li><Link to="/blog" className="hover:text-white">Blog mécanique</Link></li>
            <li><Link to="/blog/arnaques-pieces-gonflees" className="hover:text-white">Marges pièces gonflées</Link></li>
            <li><Link to="/blog/g12-plus-vs-g13-tdi" className="hover:text-white">G12+ vs G13</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <Shield className="h-4 w-4" /> Légal
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/mentions-legales" className="hover:text-white">Mentions Légales</Link></li>
            <li><Link to="/politique-de-confidentialite" className="hover:text-white">Politique de Confidentialité</Link></li>
            <li><Link to="/cgu" className="hover:text-white">CGU</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
            <FileText className="h-4 w-4" /> Infos
          </h4>
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
