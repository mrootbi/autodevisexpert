import { supabase } from './supabase';

const AUTH_FLAG = 'autodevis_admin_session';
const AUTH_TOKEN = 'autodevis_admin_token';
/** Session-only admin password — used for SECURITY DEFINER RPCs. */
const AUTH_PASSWORD = 'autodevis_admin_password';
const AUTH_USERNAME = 'autodevis_admin_username';

export function isLoggedIn(): boolean {
  return sessionStorage.getItem(AUTH_FLAG) === 'true';
}

export function getAdminToken(): string {
  return sessionStorage.getItem(AUTH_TOKEN) || '';
}

export function getAdminPassword(): string {
  return sessionStorage.getItem(AUTH_PASSWORD) || '';
}

export function getAdminUsername(): string {
  return sessionStorage.getItem(AUTH_USERNAME) || '';
}

export function canAccessGeminiSecrets(): boolean {
  return isLoggedIn() && (!!getAdminToken() || !!getAdminPassword());
}

function persistSession(opts: { token?: string; password: string; username: string }) {
  sessionStorage.setItem(AUTH_FLAG, 'true');
  sessionStorage.setItem(AUTH_PASSWORD, opts.password);
  sessionStorage.setItem(AUTH_USERNAME, opts.username);
  if (opts.token) sessionStorage.setItem(AUTH_TOKEN, opts.token);
  else sessionStorage.removeItem(AUTH_TOKEN);
}

/** Keep session in sync after changing credentials from the dashboard. */
export function updateSessionCredentials(opts: { username: string; password: string }) {
  if (!isLoggedIn()) return;
  sessionStorage.setItem(AUTH_USERNAME, opts.username);
  sessionStorage.setItem(AUTH_PASSWORD, opts.password);
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_FLAG);
  sessionStorage.removeItem(AUTH_TOKEN);
  sessionStorage.removeItem(AUTH_PASSWORD);
  sessionStorage.removeItem(AUTH_USERNAME);
}

function supabaseFunctionsBase(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return null;
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
}

async function verifyCredentialsViaRpc(username: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_verify_credentials', {
    p_username: username.trim(),
    p_password: password,
  });

  if (error) {
    console.warn('admin_verify_credentials RPC failed', error.message);
    throw error;
  }

  return data === true;
}

/**
 * Authenticate against Supabase `admin_panel_username` / `admin_panel_password`.
 * Optionally also obtains an Edge JWT when admin-auth is deployed.
 */
export async function login(username: string, password: string): Promise<boolean> {
  const user = username.trim();
  if (!user || !password) return false;

  // Primary source of truth: Supabase RPC (app_settings).
  let rpcOk = false;
  try {
    rpcOk = await verifyCredentialsViaRpc(user, password);
  } catch {
    // Migration not applied yet — do not fall back to hardcoded secrets.
    throw new Error(
      'Authentification indisponible. Appliquez la migration admin credentials dans Supabase, puis réessayez.',
    );
  }

  if (!rpcOk) return false;

  // Optional Edge JWT for service_role secret routes.
  const base = supabaseFunctionsBase();
  const key = anonKey();
  let token: string | undefined;

  if (base && key) {
    try {
      const res = await fetch(`${base}/admin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify({ username: user, password }),
      });

      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) token = data.token;
      }
    } catch {
      /* Edge optional — RPC login is enough for local/dev */
    }
  }

  persistSession({ token, password, username: user });
  return true;
}
