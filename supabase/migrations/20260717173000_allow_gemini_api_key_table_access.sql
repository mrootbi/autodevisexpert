-- Allow direct table read/write for gemini_api_key only (bypasses stuck RPC schema cache).
-- Table name: public.app_settings
-- Other secrets (admin_panel_*) stay blocked by is_secret_setting policies.

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('gemini_api_key', '', now())
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "select_gemini_api_key" ON app_settings;
DROP POLICY IF EXISTS "insert_gemini_api_key" ON app_settings;
DROP POLICY IF EXISTS "update_gemini_api_key" ON app_settings;

-- Permissive policies are OR'd with existing ones — this unlocks only this key.
CREATE POLICY "select_gemini_api_key"
  ON app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'gemini_api_key');

CREATE POLICY "insert_gemini_api_key"
  ON app_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (key = 'gemini_api_key');

CREATE POLICY "update_gemini_api_key"
  ON app_settings
  FOR UPDATE
  TO anon, authenticated
  USING (key = 'gemini_api_key')
  WITH CHECK (key = 'gemini_api_key');
