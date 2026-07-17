-- Secure Gemini API key storage + tighten RLS on app_settings secrets.
-- Secret rows are NEVER readable/writable by anon (or authenticated clients).
-- Only the service_role (Edge Functions) can access them.

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('gemini_api_key', '', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_secret_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setting_key IN ('gemini_api_key', 'gemini_api_keys');
$$;

-- Replace permissive policies from the original migration.
DROP POLICY IF EXISTS "insert_app_settings_any" ON app_settings;
DROP POLICY IF EXISTS "select_app_settings_any" ON app_settings;
DROP POLICY IF EXISTS "update_app_settings_any" ON app_settings;
DROP POLICY IF EXISTS "delete_app_settings_any" ON app_settings;

-- Public (anon) may read non-secret settings (AdSense, prompts, blog, sitemap…).
CREATE POLICY "select_app_settings_public"
  ON app_settings
  FOR SELECT
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key));

-- Public may write non-secret settings (existing admin UI uses the anon key).
CREATE POLICY "insert_app_settings_public"
  ON app_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (NOT public.is_secret_setting(key));

CREATE POLICY "update_app_settings_public"
  ON app_settings
  FOR UPDATE
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key))
  WITH CHECK (NOT public.is_secret_setting(key));

CREATE POLICY "delete_app_settings_public"
  ON app_settings
  FOR DELETE
  TO anon, authenticated
  USING (NOT public.is_secret_setting(key));

-- Explicit deny note: no policies grant anon/authenticated access to secret keys.
-- service_role bypasses RLS and is used exclusively by Edge Functions.
