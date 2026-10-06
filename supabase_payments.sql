-- Run this standalone migration in the connected project's Supabase SQL Editor.
-- Each row is one user's history entry, written by a trusted payment backend.
-- user_id must be the real UUID from Supabase Authentication, not a demo usr_ ID.
-- This migration inserts no dummy transactions and does not process payments.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_name TEXT NOT NULL CHECK (length(trim(counterparty_name)) > 0),
  counterparty_avatar_url TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'LKR' CHECK (currency ~ '^[A-Z]{3}$'),
  direction TEXT NOT NULL CHECK (direction IN ('Sent', 'Received')),
  status TEXT NOT NULL CHECK (status IN ('Paid', 'Pending', 'Refunded')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_history_idx
  ON public.payments (user_id, occurred_at DESC, id DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own payment history" ON public.payments;
CREATE POLICY "Users can read their own payment history"
  ON public.payments FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- App clients can only read. Payment records must come from a trusted backend.
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
