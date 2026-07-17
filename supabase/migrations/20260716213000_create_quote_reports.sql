-- Programmatic SEO: anonymized quote analysis reports (no personal data)
CREATE TABLE IF NOT EXISTS quote_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  car_slug text NOT NULL,
  path_slug text NOT NULL UNIQUE,
  marque text NOT NULL,
  modele text NOT NULL,
  version text,
  moteur text,
  kilometrage text,
  input_mode text NOT NULL DEFAULT 'symptomes',
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  expert_advice jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_garagiste numeric(10,2) NOT NULL,
  total_reel numeric(10,2) NOT NULL,
  published boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS quote_reports_published_created_idx
  ON quote_reports (published, created_at DESC);

CREATE INDEX IF NOT EXISTS quote_reports_path_slug_idx
  ON quote_reports (path_slug);

ALTER TABLE quote_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_quote_reports_any"
  ON quote_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "select_quote_reports_published"
  ON quote_reports FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "update_quote_reports_any"
  ON quote_reports FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
