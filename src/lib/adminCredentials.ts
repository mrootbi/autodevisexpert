import { supabase } from './supabase';
import { canAccessGeminiSecrets, getAdminPassword, getAdminUsername, updateSessionCredentials } from './adminAuth';

const USERNAME_KEY = 'admin_panel_username';
const PASSWORD_KEY = 'admin_panel_password';

function isSchemaCacheError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('could not find the function') ||
    m.includes('pgrst202') ||
    m.includes('pgrst203')
  );
}

async function fetchCredentialRows(): Promise<{ username: string; password: string }> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [USERNAME_KEY, PASSWORD_KEY]);

  if (error) {
    if (/row-level security|rls|42501|permission/i.test(error.message)) {
      throw new Error(
        'RLS bloque la lecture des identifiants. Appliquez la migration « allow admin credentials table access ».',
      );
    }
    throw new Error(error.message || 'Impossible de charger les identifiants.');
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row?.key) map[row.key] = String(row.value ?? '');
  }

  return {
    username: (map[USERNAME_KEY] || 'admin').trim() || 'admin',
    password: map[PASSWORD_KEY] || '',
  };
}

export async function fetchAdminUsername(): Promise<string> {
  if (!canAccessGeminiSecrets()) {
    throw new Error('Session admin incomplete — reconnectez-vous.');
  }

  // Prefer direct table read (avoids PostgREST RPC cache issues).
  try {
    const rows = await fetchCredentialRows();
    return rows.username;
  } catch (tableErr) {
    // Fallback RPC if table policies are not applied yet.
    const password = getAdminPassword();
    if (!password) throw tableErr;

    const { data, error } = await supabase.rpc('admin_get_username', {
      p_password: password,
    });

    if (error) {
      if (isSchemaCacheError(error.message)) throw tableErr;
      if (/unauthorized|42501/i.test(error.message)) {
        throw new Error('Session expirée — reconnectez-vous.');
      }
      throw new Error(error.message || 'Impossible de charger le nom d’utilisateur.');
    }

    return String(data ?? 'admin');
  }
}

export async function saveAdminCredentials(opts: {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
}): Promise<{ username: string; passwordChanged: boolean }> {
  if (!canAccessGeminiSecrets()) {
    throw new Error('Session admin incomplete — reconnectez-vous.');
  }

  const currentPassword = opts.currentPassword;
  const newUsername = opts.newUsername.trim();
  const newPassword = opts.newPassword;

  if (!currentPassword) {
    throw new Error('Saisissez votre mot de passe actuel.');
  }
  if (newUsername.length < 3) {
    throw new Error('Le nom d’utilisateur doit faire au moins 3 caractères.');
  }
  if (newPassword && newPassword.length < 8) {
    throw new Error('Le nouveau mot de passe doit faire au moins 8 caractères.');
  }

  // 1) Try RPC first (when schema cache works).
  const { data, error } = await supabase.rpc('admin_update_credentials', {
    p_current_password: currentPassword,
    p_new_username: newUsername,
    p_new_password: newPassword || '',
  });

  if (!error) {
    const payload = (data ?? {}) as { username?: string; password_changed?: boolean };
    const username = String(payload.username ?? newUsername);
    const passwordChanged = !!payload.password_changed;
    const sessionPassword = passwordChanged ? newPassword : currentPassword;
    updateSessionCredentials({ username, password: sessionPassword });
    return { username, passwordChanged };
  }

  // 2) Bypass stuck RPC → direct app_settings upsert.
  if (!isSchemaCacheError(error.message) && !/unauthorized|42501/i.test(error.message)) {
    // Unexpected RPC error — still try table path as fallback.
    console.warn('admin_update_credentials RPC failed, trying table upsert', error.message);
  }

  if (/unauthorized|42501/i.test(error.message) && !isSchemaCacheError(error.message)) {
    // Wrong password according to RPC — don't silently upsert.
    throw new Error('Mot de passe actuel incorrect.');
  }

  return saveCredentialsViaTable({
    currentPassword,
    newUsername,
    newPassword,
  });
}

async function saveCredentialsViaTable(opts: {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
}): Promise<{ username: string; passwordChanged: boolean }> {
  const rows = await fetchCredentialRows();

  // Accept either DB password or current session password as "current".
  const sessionPass = getAdminPassword();
  const currentOk =
    opts.currentPassword === rows.password ||
    (sessionPass !== '' && opts.currentPassword === sessionPass);

  if (!currentOk) {
    throw new Error('Mot de passe actuel incorrect.');
  }

  // Optional: username must match existing admin when verifying via session alone
  // (if DB password row was empty / inaccessible, still require session match above).

  const finalPassword = opts.newPassword ? opts.newPassword : rows.password || opts.currentPassword;
  const passwordChanged = !!opts.newPassword && opts.newPassword !== rows.password;

  const now = new Date().toISOString();
  const { error } = await supabase.from('app_settings').upsert(
    [
      { key: USERNAME_KEY, value: opts.newUsername, updated_at: now },
      { key: PASSWORD_KEY, value: finalPassword, updated_at: now },
    ],
    { onConflict: 'key' },
  );

  if (error) {
    if (/row-level security|rls|42501|permission/i.test(error.message)) {
      throw new Error(
        'RLS bloque l’écriture des identifiants. Appliquez la migration « allow admin credentials table access ».',
      );
    }
    throw new Error(error.message || 'Échec de la mise à jour des identifiants.');
  }

  updateSessionCredentials({ username: opts.newUsername, password: finalPassword });
  return { username: opts.newUsername, passwordChanged };
}

export function validateAdminCredentialsForm(opts: {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
  usernameUnchanged: boolean;
  passwordUnchanged: boolean;
}): string | null {
  if (!opts.currentPassword.trim()) {
    return 'Saisissez votre mot de passe actuel pour confirmer la modification.';
  }
  if (opts.newUsername.trim().length < 3) {
    return 'Le nom d’utilisateur doit faire au moins 3 caractères.';
  }
  if (opts.newPassword && opts.newPassword.length < 8) {
    return 'Le nouveau mot de passe doit faire au moins 8 caractères.';
  }
  if (opts.usernameUnchanged && opts.passwordUnchanged) {
    return 'Aucune modification à enregistrer (changez le nom d’utilisateur ou le mot de passe).';
  }
  return null;
}

/** @deprecated Prefer explicit currentPassword from the form. */
export function getSessionUsernameHint(): string {
  return getAdminUsername() || 'admin';
}
