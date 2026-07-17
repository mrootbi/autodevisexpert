-- Allow direct table access for admin credential rows (RPC schema-cache bypass).
-- Table: public.app_settings — keys admin_panel_username / admin_panel_password

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('admin_panel_username', 'admin', now()),
  ('admin_panel_password', 'password123', now())
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "select_admin_credentials" ON app_settings;
DROP POLICY IF EXISTS "insert_admin_credentials" ON app_settings;
DROP POLICY IF EXISTS "update_admin_credentials" ON app_settings;

CREATE POLICY "select_admin_credentials"
  ON app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('admin_panel_username', 'admin_panel_password'));

CREATE POLICY "insert_admin_credentials"
  ON app_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (key IN ('admin_panel_username', 'admin_panel_password'));

CREATE POLICY "update_admin_credentials"
  ON app_settings
  FOR UPDATE
  TO anon, authenticated
  USING (key IN ('admin_panel_username', 'admin_panel_password'))
  WITH CHECK (key IN ('admin_panel_username', 'admin_panel_password'));
