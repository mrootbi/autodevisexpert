-- Stores each devis analysis generation (user-facing + admin view)
CREATE TABLE IF NOT EXISTS devis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  marque text,
  modele text,
  version text,
  moteur text,
  kilometrage integer,
  input_mode text NOT NULL DEFAULT 'symptomes', -- 'symptomes' | 'devis'
  prix_garagiste numeric(10,2),
  prix_reel numeric(10,2),
  symptomes_devis text,
  adresse_ip inet
);

ALTER TABLE devis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_devis_history_any"
  ON devis_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "select_devis_history_any"
  ON devis_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "delete_devis_history_any"
  ON devis_history FOR DELETE
  TO anon, authenticated
  USING (true);

-- App-wide settings (single-row key/value style). Stores AdSense pub id.
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_app_settings_any"
  ON app_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "select_app_settings_any"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "update_app_settings_any"
  ON app_settings FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "delete_app_settings_any"
  ON app_settings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed default publisher id placeholder
INSERT INTO app_settings (key, value) VALUES
  ('adsense_publisher_id', 'pub-0000000000000000')
ON CONFLICT (key) DO NOTHING;

