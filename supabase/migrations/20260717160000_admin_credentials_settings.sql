-- Admin credentials in app_settings (no more hardcoded frontend passwords).
-- Defaults: username `admin`, password `password123` (change from the dashboard after login).

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('admin_panel_username', 'admin', now()),
  ('admin_panel_password', 'password123', now())
ON CONFLICT (key) DO NOTHING;

-- Keep secret keys out of anon SELECT on app_settings.
CREATE OR REPLACE FUNCTION public.is_secret_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT setting_key IN (
    'gemini_api_key',
    'gemini_api_keys',
    'admin_panel_password',
    'admin_panel_username'
  );
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

-- Login guard: username + password must both match app_settings.
CREATE OR REPLACE FUNCTION public.admin_verify_credentials(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user text;
  v_pass text;
BEGIN
  IF p_username IS NULL OR btrim(p_username) = '' OR p_password IS NULL OR btrim(p_password) = '' THEN
    RETURN false;
  END IF;

  SELECT value INTO v_user FROM app_settings WHERE key = 'admin_panel_username' LIMIT 1;
  SELECT value INTO v_pass FROM app_settings WHERE key = 'admin_panel_password' LIMIT 1;

  v_user := coalesce(nullif(btrim(v_user), ''), 'admin');
  v_pass := coalesce(nullif(btrim(v_pass), ''), 'password123');

  RETURN btrim(p_username) = v_user AND p_password = v_pass;
END;
$$;

-- Prefill username in the dashboard (requires a valid current password).
CREATE OR REPLACE FUNCTION public.admin_get_username(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin_panel_password(p_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce(
    nullif(btrim((SELECT value FROM app_settings WHERE key = 'admin_panel_username' LIMIT 1)), ''),
    'admin'
  );
END;
$$;

-- Update username and/or password. Empty p_new_password keeps the current password.
CREATE OR REPLACE FUNCTION public.admin_update_credentials(
  p_current_password text,
  p_new_username text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text := btrim(coalesce(p_new_username, ''));
  v_password text := coalesce(p_new_password, '');
  v_final_password text;
BEGIN
  IF NOT public.verify_admin_panel_password(p_current_password) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_username = '' OR char_length(v_username) < 3 THEN
    RAISE EXCEPTION 'invalid_username' USING ERRCODE = '22023';
  END IF;

  IF v_password <> '' AND char_length(v_password) < 8 THEN
    RAISE EXCEPTION 'invalid_password' USING ERRCODE = '22023';
  END IF;

  v_final_password := CASE
    WHEN v_password = '' THEN p_current_password
    ELSE v_password
  END;

  INSERT INTO app_settings (key, value, updated_at)
  VALUES ('admin_panel_username', v_username, now())
  ON CONFLICT (key) DO UPDATE
    SET value = excluded.value,
        updated_at = excluded.updated_at;

  INSERT INTO app_settings (key, value, updated_at)
  VALUES ('admin_panel_password', v_final_password, now())
  ON CONFLICT (key) DO UPDATE
    SET value = excluded.value,
        updated_at = excluded.updated_at;

  RETURN jsonb_build_object(
    'ok', true,
    'username', v_username,
    'password_changed', v_password <> ''
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_credentials(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_username(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_credentials(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_verify_credentials(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_credentials(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
