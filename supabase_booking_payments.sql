-- Run after supabase_demo_payments.sql and supabase_payment_methods.sql.
-- Adds booking metadata and records a reservation with its prototype payment
-- confirmation in one transaction. This function does not charge a card.
BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booker_name TEXT,
  ADD COLUMN IF NOT EXISTS discovery_tutor_id TEXT;

ALTER TABLE public.demo_payments
  ADD COLUMN IF NOT EXISTS booker_name TEXT,
  ADD COLUMN IF NOT EXISTS tutor_id TEXT,
  ADD COLUMN IF NOT EXISTS counterparty_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Real payment backends may also supply these fields when recording transactions.
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS booker_name TEXT,
  ADD COLUMN IF NOT EXISTS tutor_id TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.record_booking_payment(
  p_reference TEXT,
  p_card_id UUID,
  p_booking JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_card public.payment_methods%ROWTYPE;
  v_payment public.demo_payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_tutor_id TEXT;
  v_tutor_name TEXT;
  v_tutor_photo TEXT;
  v_tutor_user UUID;
  v_booker_name TEXT;
  v_subject TEXT := trim(p_booking->>'subject');
  v_slot TEXT := trim(p_booking->>'slot');
  v_mode TEXT := p_booking->>'mode';
  v_group TEXT := p_booking->>'groupSize';
  v_session_date DATE;
  v_session_fee NUMERIC;
  v_platform_fee NUMERIC;
  v_total NUMERIC;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Sign in before confirming a booking.' USING ERRCODE = '42501';
  END IF;
  IF p_reference IS NULL OR p_reference !~ '^DEMO-[A-Z0-9]+-[A-Z0-9]+$'
    OR p_booking IS NULL OR jsonb_typeof(p_booking) <> 'object' THEN
    RAISE EXCEPTION 'Invalid booking confirmation.';
  END IF;

  -- Serialize retries of this reference; a lost response cannot reserve twice.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || ':' || p_reference, 0)
  );
  SELECT * INTO v_payment FROM public.demo_payments
    WHERE user_id = v_owner AND reference = p_reference;
  IF FOUND THEN
    SELECT * INTO v_booking FROM public.bookings
      WHERE id = v_payment.booking_id AND student_id = v_owner;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The original booking is no longer available.';
    END IF;
    RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_card FROM public.payment_methods
    WHERE id = p_card_id AND user_id = v_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Select one of your saved cards.' USING ERRCODE = '42501';
  END IF;

  -- IDs in the discovery tutors table are text; bookings.tutor_id uses profile UUIDs.
  BEGIN
    SELECT t.id::text, trim(t.name), coalesce(t.photo_url, t."photoUrl"), t.user_id
      INTO STRICT v_tutor_id, v_tutor_name, v_tutor_photo, v_tutor_user
      FROM public.tutors t
      WHERE (nullif(p_booking->>'tutorId', '') IS NOT NULL
          AND t.id::text = p_booking->>'tutorId')
        OR (nullif(p_booking->>'tutorId', '') IS NULL
          AND lower(trim(t.name)) = lower(trim(p_booking->>'tutorName')));
  EXCEPTION
    WHEN no_data_found OR too_many_rows THEN
      RAISE EXCEPTION 'Please select a tutor profile before booking.';
  END;
  IF v_tutor_name IS DISTINCT FROM trim(p_booking->>'tutorName') THEN
    RAISE EXCEPTION 'The tutor details changed. Please reopen the tutor profile.';
  END IF;

  SELECT nullif(trim(full_name), '') INTO v_booker_name FROM public.profiles WHERE id = v_owner;
  IF v_booker_name IS NULL THEN
    SELECT coalesce(nullif(trim(raw_user_meta_data->>'fullName'), ''),
      nullif(trim(raw_user_meta_data->>'full_name'), '')) INTO v_booker_name
      FROM auth.users WHERE id = v_owner;
  END IF;
  v_booker_name := coalesce(v_booker_name, nullif(trim(p_booking->>'bookerName'), ''));
  v_session_date := make_date((p_booking->>'year')::integer,
    (p_booking->>'month')::integer + 1, (p_booking->>'date')::integer);
  v_session_fee := (p_booking->>'sessionFee')::numeric;
  v_platform_fee := (p_booking->>'platformFee')::numeric;
  v_total := (p_booking->>'total')::numeric;
  IF v_booker_name IS NULL OR length(v_booker_name) > 200
    OR v_subject IS NULL OR length(v_subject) NOT BETWEEN 1 AND 300
    OR v_slot IS NULL OR length(v_slot) NOT BETWEEN 1 AND 80
    OR v_mode IS NULL OR v_mode NOT IN ('online', 'physical')
    OR v_group IS NULL OR v_group NOT IN ('private', 'small', 'large')
    OR v_session_date IS NULL OR v_session_fee IS NULL OR v_platform_fee IS NULL OR v_total IS NULL
    OR v_session_fee <= 0 OR v_platform_fee < 0 OR v_total <= 0
    OR v_total::text IN ('NaN', 'Infinity', '-Infinity')
    OR v_total <> v_session_fee + v_platform_fee THEN
    RAISE EXCEPTION 'Check the booking name, subject, date and fees before continuing.';
  END IF;

  IF nullif(p_booking->>'rescheduleId', '') IS NOT NULL THEN
    UPDATE public.bookings SET tutor_name = v_tutor_name, subject = v_subject,
      year = extract(year FROM v_session_date)::integer,
      month = extract(month FROM v_session_date)::integer,
      date = extract(day FROM v_session_date)::integer, slot = v_slot,
      mode = v_mode, group_size = v_group, total_fee = v_total,
      session_fee = v_session_fee, platform_fee = v_platform_fee,
      status = 'Confirmed', session_date = v_session_date,
      booker_name = v_booker_name, discovery_tutor_id = v_tutor_id, tutor_id = v_tutor_user
      WHERE id = (p_booking->>'rescheduleId')::uuid AND student_id = v_owner
      RETURNING * INTO v_booking;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Only your own booking can be rescheduled.' USING ERRCODE = '42501';
    END IF;
  ELSE
    INSERT INTO public.bookings (student_id, tutor_id, discovery_tutor_id,
      booker_name, tutor_name, subject, year, month, date, slot, session_date,
      mode, group_size, total_fee, session_fee, platform_fee, status)
    VALUES (v_owner, v_tutor_user, v_tutor_id, v_booker_name, v_tutor_name, v_subject,
      extract(year FROM v_session_date)::integer, extract(month FROM v_session_date)::integer,
      extract(day FROM v_session_date)::integer, v_slot, v_session_date,
      v_mode, v_group, v_total, v_session_fee, v_platform_fee, 'Confirmed')
    RETURNING * INTO v_booking;
  END IF;

  INSERT INTO public.demo_payments (user_id, reference, counterparty_name,
    counterparty_avatar_url, booker_name, tutor_id, booking_id, amount, currency,
    subject, session_date, session_time, card_brand, card_last4)
  VALUES (v_owner, p_reference, v_tutor_name, v_tutor_photo, v_booker_name,
    v_tutor_id, v_booking.id, v_total, 'LKR', v_subject, v_session_date,
    v_slot, v_card.brand, v_card.last4)
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'booking', to_jsonb(v_booking));
END;
$$;

REVOKE ALL ON FUNCTION public.record_booking_payment(TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(TEXT, UUID, JSONB) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
