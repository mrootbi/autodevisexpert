/**
 * Public contact form handler.
 * - Validates + rate-limits submissions
 * - Persists to `contact_messages` (service_role)
 * - Emails contact@autodevisexpert.com via Resend when RESEND_API_KEY is set
 *
 * Deploy: supabase functions deploy contact-submit --no-verify-jwt
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY          required for e-mail delivery
 *   CONTACT_TO_EMAIL        optional, default contact@autodevisexpert.com
 *   CONTACT_FROM_EMAIL      optional, default AutoDevis Expert <noreply@autodevisexpert.com>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CLIENT_RATE_WINDOW_MS = 60_000;
const CLIENT_RATE_MAX = 5;
const CLIENT_RATE_BURST_WINDOW_MS = 20_000;
const CLIENT_RATE_BURST_MAX = 2;

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5_000;
const MIN_MESSAGE = 10;

const DEFAULT_TO = 'contact@autodevisexpert.com';
const DEFAULT_FROM = 'AutoDevis Expert <noreply@autodevisexpert.com>';

type RateBucket = number[];
const rateBuckets = new Map<string, RateBucket>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  return cf || realIp || forwarded || 'unknown';
}

function pruneBucket(bucket: RateBucket, now: number, windowMs: number): RateBucket {
  return bucket.filter((t) => now - t < windowMs);
}

function allowClientRequest(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const inWindow = pruneBucket(prev, now, CLIENT_RATE_WINDOW_MS);
  const inBurst = pruneBucket(inWindow, now, CLIENT_RATE_BURST_WINDOW_MS);

  if (inBurst.length >= CLIENT_RATE_BURST_MAX || inWindow.length >= CLIENT_RATE_MAX) {
    rateBuckets.set(ip, inWindow);
    return false;
  }

  inWindow.push(now);
  rateBuckets.set(ip, inWindow);
  return true;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(text: string, max: number): string {
  return text.replace(/\0/g, '').trim().slice(0, max);
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendResendEmail(opts: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  apiKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      reply_to: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: `Resend HTTP ${res.status}: ${body.slice(0, 300)}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  if (!allowClientRequest(ip)) {
    return json(429, { error: 'Trop de messages. Réessayez dans une minute.' });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'JSON invalide' });
  }

  // Honeypot — bots fill hidden fields; humans leave empty.
  const honey = typeof body.website === 'string' ? body.website.trim() : '';
  if (honey) {
    return json(200, { ok: true, stored: true, emailed: false });
  }

  const name = sanitize(typeof body.name === 'string' ? body.name : '', MAX_NAME);
  const email = sanitize(typeof body.email === 'string' ? body.email : '', MAX_EMAIL).toLowerCase();
  const message = sanitize(typeof body.message === 'string' ? body.message : '', MAX_MESSAGE);

  if (!name || name.length < 2) {
    return json(400, { error: 'Nom invalide' });
  }
  if (!email || !isValidEmail(email)) {
    return json(400, { error: 'E-mail invalide' });
  }
  if (!message || message.length < MIN_MESSAGE) {
    return json(400, { error: 'Message trop court' });
  }

  const toEmail = (Deno.env.get('CONTACT_TO_EMAIL') || DEFAULT_TO).trim() || DEFAULT_TO;
  const fromEmail = (Deno.env.get('CONTACT_FROM_EMAIL') || DEFAULT_FROM).trim() || DEFAULT_FROM;
  const resendKey = (Deno.env.get('RESEND_API_KEY') || '').trim();
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 400);

  let emailSent = false;
  let emailError: string | null = null;

  if (resendKey) {
    const subject = `[Contact AutoDevis] Message de ${name}`;
    const text = [
      'Nouveau message via le formulaire de contact.',
      '',
      `Nom : ${name}`,
      `E-mail : ${email}`,
      `IP : ${ip}`,
      '',
      '— Message —',
      message,
      '',
      'Répondez directement à cet e-mail (Reply-To = adresse du client).',
    ].join('\n');

    const sent = await sendResendEmail({
      to: toEmail,
      from: fromEmail,
      replyTo: email,
      subject,
      text,
      apiKey: resendKey,
    });
    emailSent = sent.ok;
    emailError = sent.ok ? null : sent.error ?? 'Envoi e-mail échoué';
  } else {
    emailError = 'RESEND_API_KEY manquant — message stocké sans e-mail';
  }

  const supabase = serviceClient();
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name,
    email,
    message,
    ip,
    user_agent: userAgent,
    email_sent: emailSent,
    email_error: emailError,
  });

  if (dbError) {
    console.error('[contact-submit] DB insert failed', dbError.message);
    // If e-mail succeeded but DB failed, still report success to the user.
    if (emailSent) {
      return json(200, { ok: true, stored: false, emailed: true });
    }
    return json(500, { error: 'Impossible d’enregistrer le message. Réessayez plus tard.' });
  }

  // Persist even when e-mail is not configured — inquiries are never silently dropped.
  return json(200, {
    ok: true,
    stored: true,
    emailed: emailSent,
    // Hint for operators / logs only; keep generic for clients.
  });
});
