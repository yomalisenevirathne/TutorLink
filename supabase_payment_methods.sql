-- Saved cards and card management use the existing public.payment_methods table.
-- Run in the same project's SQL Editor to update its read/save/edit/remove permissions.
-- CREATE TABLE IF NOT EXISTS reuses the existing table and preserves its card rows.
-- No sample cards are inserted. This stores display details, not payment tokens.
-- A payment provider is required before these cards can be used to charge money.
-- Full card numbers and CVV are never submitted or stored in this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL CHECK (length(trim(brand)) > 0),
  last4 TEXT NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  exp_month SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year SMALLINT NOT NULL CHECK (exp_year BETWEEN 2000 AND 9999),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  cardholder_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supports installations that already ran the earlier read-only migration.
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS cardholder_name TEXT;
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_cardholder_name_check;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_cardholder_name_check
  CHECK (cardholder_name IS NULL OR length(trim(cardholder_name)) BETWEEN 2 AND 80);

CREATE INDEX IF NOT EXISTS payment_methods_user_idx
  ON public.payment_methods (user_id, is_default DESC, created_at DESC);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their saved cards" ON public.payment_methods;
CREATE POLICY "Users can read their saved cards"
  ON public.payment_methods FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can save their card metadata" ON public.payment_methods;
CREATE POLICY "Users can save their card metadata"
  ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can edit their card metadata" ON public.payment_methods;
CREATE POLICY "Users can edit their card metadata"
  ON public.payment_methods FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can remove their saved cards" ON public.payment_methods;
CREATE POLICY "Users can remove their saved cards"
  ON public.payment_methods FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.payment_methods FROM anon, authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT INSERT (user_id, brand, last4, exp_month, exp_year, cardholder_name)
  ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
GRANT UPDATE (cardholder_name, exp_month, exp_year) ON public.payment_methods TO authenticated;
GRANT DELETE ON public.payment_methods TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
