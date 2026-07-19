-- `quote_reports` had an unrestricted UPDATE policy (USING(true)/WITH CHECK(true))
-- for anon+authenticated, letting anyone rewrite the numbers/text of any
-- published public devis report via a direct REST PATCH. The app never
-- updates existing report rows (only INSERT then read-only), so this is
-- pure unused attack surface — drop it entirely.

DROP POLICY IF EXISTS "update_quote_reports_any" ON public.quote_reports;

NOTIFY pgrst, 'reload schema';
