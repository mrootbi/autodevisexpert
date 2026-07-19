import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Wrench, Menu, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

function AnalysesNavLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      className="relative inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-600 transition-colors duration-200 hover:bg-emerald-100"
      to="/devis-analyses"
      onClick={onClick}
    >
      Dernières analyses
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'text-trust-700 bg-trust-50' : 'text-slate-600 hover:text-trust-700 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-h-[44px] min-w-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-trust-700 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="truncate font-display text-lg font-extrabold tracking-tight text-slate-900">
            AutoDevis<span className="text-trust-700"> Expert</span>
          </span>
        </Link>

        <nav className="hidden md:block" aria-label="Navigation principale">
          <ul className="flex list-none items-center gap-1 p-0 m-0">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className={linkClass}>
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <AnalysesNavLink />
            </li>
            <li>
              <Link to="/#outil" className="btn-primary ml-2 px-4">
                Analyser un devis
              </Link>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="mobile-primary-nav"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-primary-nav"
          className="border-t border-slate-200 bg-white md:hidden animate-fadeIn"
          aria-label="Menu mobile"
        >
          <ul className="mx-auto flex max-w-7xl list-none flex-col gap-1 px-4 py-3 m-0">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <AnalysesNavLink onClick={() => setOpen(false)} />
            </li>
            <li>
              <Link to="/#outil" className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>
                Analyser un devis
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
