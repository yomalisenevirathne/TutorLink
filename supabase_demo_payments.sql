-- Run once in the same project's Supabase SQL Editor.
-- Stores prototype confirmations shown alongside real payments in Payment History.
-- Real payment records and their backend-only write permissions remain unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS public.demo_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL CHECK (reference ~ '^DEMO-[A-Z0-9]+-[A-Z0-9]+$'),
  counterparty_name TEXT NOT NULL CHECK (length(trim(counterparty_name)) > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'LKR' CHECK (currency = 'LKR'),
  status TEXT NOT NULL DEFAULT 'Demo' CHECK (status = 'Demo'),
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  session_date DATE NOT NULL,
  session_time TEXT NOT NULL CHECK (length(trim(session_time)) > 0),
  card_brand TEXT NOT NULL CHECK (card_brand IN ('Visa', 'Mastercard', 'American Express')),
  card_last4 TEXT NOT NULL CHECK (card_last4 ~ '^[0-9]{4}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reference)
);

CREATE INDEX IF NOT EXISTS demo_payments_user_history_idx
  ON public.demo_payments (user_id, occurred_at DESC, id DESC);
ALTER TABLE public.demo_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their demo payments" ON public.demo_payments;
CREATE POLICY "Users can read their demo payments"
  ON public.demo_payments FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can save their demo confirmations" ON public.demo_payments;
CREATE POLICY "Users can save their demo confirmations"
  ON public.demo_payments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'Demo');

REVOKE ALL ON public.demo_payments FROM anon, authenticated;
GRANT SELECT ON public.demo_payments TO authenticated;
GRANT INSERT (user_id, reference, counterparty_name, amount, currency, subject,
  session_date, session_time, card_brand, card_last4)
  ON public.demo_payments TO authenticated;
GRANT ALL ON public.demo_payments TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
