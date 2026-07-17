-- Password-gated RPCs so local/dev can read/write gemini_api_key without Edge Functions.
-- The password is stored in app_settings (secret row) and defaults to the demo admin password.

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('admin_panel_password', 'password123', now()),
  ('gemini_api_key', '', now())
ON CONFLICT (key) DO NOTHING;

-- Treat admin panel password as a secret (blocked from anon table SELECT).
CREATE OR REPLACE FUNCTION public.is_secret_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setting_key IN ('gemini_api_key', 'gemini_api_keys', 'admin_panel_password');
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_panel_password(p_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value = p_password FROM app_settings WHERE key = 'admin_panel_password' LIMIT 1),
    p_password = 'password123'
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_get_gemini_api_key(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS NULL OR btrim(p_password) = '' OR NOT public.verify_admin_panel_password(p_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT value FROM app_settings WHERE key = 'gemini_api_key' LIMIT 1), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_gemini_api_key(p_password text, p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text := coalesce(p_value, '');
BEGIN
  IF p_password IS NULL OR btrim(p_password) = '' OR NOT public.verify_admin_panel_password(p_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO app_settings (key, value, updated_at)
  VALUES ('gemini_api_key', v_value, now())
  ON CONFLICT (key) DO UPDATE
    SET value = excluded.value,
        updated_at = excluded.updated_at;

  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_panel_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_gemini_api_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_gemini_api_key(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.verify_admin_panel_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_gemini_api_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_gemini_api_key(text, text) TO anon, authenticated;
