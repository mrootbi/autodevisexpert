import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Send, CheckCircle2, MessageSquare, Clock, AlertCircle, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { submitContactMessage } from '../lib/contactSubmit';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  /** Honeypot — leave empty; bots often fill it. */
  const [website, setWebsite] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const result = await submitContactMessage({ name, email, message, website });
      if (!result.ok) {
        setError(result.error || 'Impossible d’envoyer le message. Réessayez.');
        return;
      }
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
      setWebsite('');
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO
        title="Contact"
        description="Contactez AutoDevis Expert pour toute question sur le comparateur de devis, la confidentialité ou le fonctionnement du service."
        canonicalPath="/contact"
      />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-trust-50 px-3 py-1 text-xs font-semibold text-trust-700">
            <MessageSquare className="h-3 w-3" /> Support & informations
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Nous contacter
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Une question sur une estimation, une demande relative à vos données personnelles, ou un
            signalement ? Écrivez-nous — nous répondons en français.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <aside className="space-y-4" aria-label="Coordonnées">
            <ContactBlock icon={<Mail className="h-5 w-5" />} title="E-mail">
              <a href="mailto:contact@autodevisexpert.com" className="break-all text-trust-700 hover:underline">
                contact@autodevisexpert.com
              </a>
            </ContactBlock>
            <ContactBlock icon={<MapPin className="h-5 w-5" />} title="Adresse">
              AutoDevis Expert
              <br />
              [Siège social — à compléter]
              <br />
              France
            </ContactBlock>
            <ContactBlock icon={<Clock className="h-5 w-5" />} title="Délai de réponse">
              2 à 5 jours ouvrés, par e-mail.
            </ContactBlock>
          </aside>

          <div className="lg:col-span-2">
            <form onSubmit={submit} className="card p-5 sm:p-8" noValidate={false} aria-label="Formulaire de contact">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
                  <CheckCircle2 className="h-12 w-12 text-action-green" />
                  <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Message envoyé</h2>
                  <p className="mt-1 max-w-md text-slate-500">
                    Merci. Nous avons bien reçu votre message et reviendrons vers vous à l&apos;adresse
                    indiquée dans les meilleurs délais.
                  </p>
                  <button type="button" className="btn-ghost mt-6" onClick={() => setSent(false)}>
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Honeypot — visually hidden from humans */}
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label htmlFor="contact-website">Site web</label>
                    <input
                      id="contact-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label-field" htmlFor="contact-name">
                        Nom
                      </label>
                      <input
                        id="contact-name"
                        className="input-field"
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                        disabled={sending}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Votre nom"
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor="contact-email">
                        E-mail
                      </label>
                      <input
                        id="contact-email"
                        className="input-field"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        disabled={sending}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@email.fr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field" htmlFor="contact-message">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      className="input-field min-h-[160px] resize-y"
                      name="message"
                      required
                      minLength={10}
                      maxLength={5000}
                      disabled={sending}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre demande…"
                    />
                  </div>
                  {error && (
                    <div
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      role="alert"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}
                  <button type="submit" className="btn-green w-full sm:w-auto" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Envoyer le message
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-400">
                    Vos données sont traitées uniquement pour répondre à votre demande, conformément à notre{' '}
                    <Link to="/politique-de-confidentialite" className="text-trust-700 underline">
                      Politique de Confidentialité
                    </Link>
                    . Aucune revente à des tiers. Destination :{' '}
                    <span className="text-slate-500">contact@autodevisexpert.com</span>.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-50 text-trust-700">{icon}</span>
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-1 text-sm text-slate-600">{children}</div>
    </div>
  );
}
