-- Production hardening: revoke public access to secrets + devis_history dumps.
-- Gemini keys & admin credentials are service_role / Edge Functions only.

-- 1) Drop the emergency "public secret" policies
DROP POLICY IF EXISTS "select_gemini_api_key" ON app_settings;
DROP POLICY IF EXISTS "insert_gemini_api_key" ON app_settings;
DROP POLICY IF EXISTS "update_gemini_api_key" ON app_settings;
DROP POLICY IF EXISTS "select_admin_credentials" ON app_settings;
DROP POLICY IF EXISTS "insert_admin_credentials" ON app_settings;
DROP POLICY IF EXISTS "update_admin_credentials" ON app_settings;

-- 2) Expand secret key classification (denied to anon/authenticated by existing policies)
CREATE OR REPLACE FUNCTION public.is_secret_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setting_key IN (
    'gemini_api_key',
    'gemini_api_keys',
    'admin_panel_username',
    'admin_panel_password',
    'admin_panel_password_hash'
  );
$$;

-- 3) devis_history: keep INSERT for logging analyses; remove public SELECT/DELETE
DROP POLICY IF EXISTS "select_devis_history_any" ON devis_history;
DROP POLICY IF EXISTS "delete_devis_history_any" ON devis_history;

-- Optional: no public SELECT — admin reads via service_role edge or SQL editor.
-- INSERT policy "insert_devis_history_any" remains for the public tool.
