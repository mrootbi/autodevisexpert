-- Contact form inquiries (public INSERT via Edge Function / service role; no public SELECT)
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  ip text,
  user_agent text,
  email_sent boolean NOT NULL DEFAULT false,
  email_error text
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx
  ON contact_messages (created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service_role (Edge Function) can read/write.
-- Intentionally omit public INSERT so spam cannot bypass the Edge Function.

COMMENT ON TABLE contact_messages IS 'Contact form submissions; written by contact-submit Edge Function only.';
