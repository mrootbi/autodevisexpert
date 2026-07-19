-- Security fix: remove the hardcoded 'password123' fallback baked into the
-- admin auth RPCs. These SECURITY DEFINER functions are GRANTed to `anon`
-- (called directly via public PostgREST RPC using only the public anon key),
-- so any caller could previously authenticate with the well-known default
-- 'password123' whenever `admin_panel_password` was missing/NULL in
-- `app_settings` — e.g. after a table reset, failed migration, or bug.
-- Now: no configured password => access denied, full stop.

CREATE OR REPLACE FUNCTION public.verify_admin_panel_password(p_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value = p_password FROM app_settings WHERE key = 'admin_panel_password' LIMIT 1),
    false
  );
$$;

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

  -- No password configured yet -> deny (never fall back to a guessable default).
  IF v_pass IS NULL OR btrim(v_pass) = '' THEN
    RETURN false;
  END IF;

  RETURN btrim(p_username) = v_user AND p_password = v_pass;
END;
$$;

-- admin_get_gemini_api_key / admin_set_gemini_api_key / admin_get_username /
-- admin_update_credentials all delegate to verify_admin_panel_password, so
-- the fix above closes the loophole for them transitively.

REVOKE ALL ON FUNCTION public.verify_admin_panel_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_verify_credentials(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.verify_admin_panel_password(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_credentials(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
