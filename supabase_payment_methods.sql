-- Run in the project's Supabase SQL Editor to enable saved-card metadata reads.
-- No sample cards are inserted. A trusted payment-provider backend writes rows
-- only after a card has been successfully added using the provider's SDK.
-- Full card numbers and CVV must never be stored in this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL CHECK (length(trim(brand)) > 0),
  last4 TEXT NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  exp_month SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year SMALLINT NOT NULL CHECK (exp_year BETWEEN 2000 AND 9999),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_methods_user_idx
  ON public.payment_methods (user_id, is_default DESC, created_at DESC);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their saved cards" ON public.payment_methods;
CREATE POLICY "Users can read their saved cards"
  ON public.payment_methods FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.payment_methods FROM anon, authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
