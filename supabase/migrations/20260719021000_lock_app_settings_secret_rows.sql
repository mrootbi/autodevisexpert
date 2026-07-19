-- CRITICAL security fix: app_settings had blanket USING(true)/WITH CHECK(true)
-- RLS policies for anon+authenticated on SELECT/INSERT/UPDATE/DELETE — meaning
-- ANY anonymous internet user could read (and blindly overwrite/delete) secret
-- rows like `gemini_api_key`, `admin_panel_username`, `admin_panel_password`
-- directly via the public PostgREST REST API, using only the public anon key.
-- Confirmed exploitable live: `gemini_api_key` was successfully read via a
-- plain anon-keyed GET request with no authentication whatsoever.
--
-- Fix: restrict every anon/authenticated policy to non-secret keys only
-- (`NOT is_secret_setting(key)`). Secret rows remain fully readable/writable
-- by the app — but exclusively through SECURITY DEFINER RPCs / service_role
-- Edge Functions, which are owned by `postgres` (BYPASSRLS) and already
-- enforce the admin password/token check.

-- Also close the mutable-search_path lint on is_secret_setting.
CREATE OR REPLACE FUNCTION public.is_secret_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT setting_key IN (
    'gemini_api_key',
    'gemini_api_keys',
    'admin_panel_username',
    'admin_panel_password',
    'admin_panel_password_hash'
  );
$$;

DROP POLICY IF EXISTS "select_app_settings_any" ON public.app_settings;
DROP POLICY IF EXISTS "insert_app_settings_any" ON public.app_settings;
DROP POLICY IF EXISTS "update_app_settings_any" ON public.app_settings;
DROP POLICY IF EXISTS "delete_app_settings_any" ON public.app_settings;

CREATE POLICY "select_app_settings_public" ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key));

CREATE POLICY "insert_app_settings_public" ON public.app_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (NOT public.is_secret_setting(key));

CREATE POLICY "update_app_settings_public" ON public.app_settings
  FOR UPDATE
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key))
  WITH CHECK (NOT public.is_secret_setting(key));

CREATE POLICY "delete_app_settings_public" ON public.app_settings
  FOR DELETE
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key));

NOTIFY pgrst, 'reload schema';
