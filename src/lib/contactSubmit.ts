import { supabase } from './supabase';

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  /** Honeypot — must stay empty. */
  website?: string;
};

export type ContactSubmitResult = {
  ok: boolean;
  stored?: boolean;
  emailed?: boolean;
  error?: string;
};

/**
 * Submit a contact inquiry via the `contact-submit` Supabase Edge Function.
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (already used site-wide).
 */
export async function submitContactMessage(payload: ContactPayload): Promise<ContactSubmitResult> {
  const name = payload.name.trim();
  const email = payload.email.trim();
  const message = payload.message.trim();

  if (name.length < 2) return { ok: false, error: 'Nom invalide' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'E-mail invalide' };
  if (message.length < 10) return { ok: false, error: 'Message trop court (10 caractères minimum)' };

  const { data, error } = await supabase.functions.invoke('contact-submit', {
    body: {
      name,
      email,
      message,
      website: payload.website ?? '',
    },
  });

  if (error) {
    const fromContext = await readFunctionsErrorMessage(error);
    return { ok: false, error: fromContext || error.message || 'Impossible d’envoyer le message' };
  }

  const body = data as ContactSubmitResult | null;
  if (!body?.ok) {
    return { ok: false, error: body?.error || 'Envoi refusé' };
  }
  return { ok: true, stored: body.stored, emailed: body.emailed };
}

async function readFunctionsErrorMessage(error: unknown): Promise<string | null> {
  const err = error as { context?: Response; message?: string };
  const res = err.context;
  if (!res || typeof res.json !== 'function') return null;
  try {
    const payload = (await res.clone().json()) as { error?: string };
    return typeof payload?.error === 'string' ? payload.error : null;
  } catch {
    return null;
  }
}
