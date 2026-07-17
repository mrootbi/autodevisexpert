-- Optional dedicated title column for list/SEO display (AI expert title).
-- Existing rows keep working via expert_advice->>'title' fallback in the app.
ALTER TABLE quote_reports
  ADD COLUMN IF NOT EXISTS title text;

UPDATE quote_reports
SET title = COALESCE(NULLIF(trim(expert_advice->>'title'), ''), title)
WHERE title IS NULL OR title = '';
