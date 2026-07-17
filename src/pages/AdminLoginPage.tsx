import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Lock, User, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import SEO from '../components/SEO';
import { login } from '../lib/adminAuth';

interface AdminLoginPageProps {
  onSuccess: () => void;
}

export default function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (ok) onSuccess();
      else setError('Identifiant ou mot de passe incorrect.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de contacter le service d’authentification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Admin — Connexion" description="Espace administrateur AutoDevis Expert." canonicalPath="/mouadbi" noIndex />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-700 text-white">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold text-slate-900">
              AutoDevis<span className="text-trust-700"> Expert</span>
            </span>
          </Link>

          <div className="card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-trust-100 text-trust-700">
                <Lock className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">Espace administrateur</h1>
              <p className="mt-1 text-sm text-slate-500">Accès réservé à l&apos;équipe AutoDevis Expert.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label-field">Identifiant</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input-field pl-10"
                    placeholder="Nom d’utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Mot de passe</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input-field px-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPass ? 'Masquer' : 'Afficher'}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-action-red/10 px-4 py-2.5 text-sm font-medium text-action-redDark">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </p>
              )}

              <button type="submit" disabled={loading || !username || !password} className="btn-green w-full">
                {loading ? 'Connexion…' : 'Se connecter'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Identifiants stockés dans Supabase — modifiables depuis Intégrations → Sécurité.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link to="/" className="hover:text-trust-700">
              ← Retour au site
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
