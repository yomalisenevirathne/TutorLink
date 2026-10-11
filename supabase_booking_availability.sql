-- Optional, unverified proposal retained for review; the app does not require it.
-- Do not apply as an integration fix without reviewing the existing backend.
-- Requires the existing bookings and tutor_sessions tables.
-- Availability exposes counts, while booking rows remain protected by RLS.
BEGIN;

CREATE OR REPLACE FUNCTION public.booking_slot_capacity(
  p_year INTEGER, p_month INTEGER, p_date INTEGER,
  p_slot TEXT, p_tutor_name TEXT, p_exclude_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'privateBooked', coalesce(bool_or(b.group_size = 'private'), false),
      'smallBookedCount', count(*) FILTER (WHERE b.group_size = 'small'),
      'largeBookedCount', count(*) FILTER (WHERE b.group_size = 'large')
    ) FROM public.bookings b
    WHERE b.year = p_year AND b.month = p_month AND b.date = p_date
      AND b.slot = p_slot AND lower(trim(b.tutor_name)) = lower(trim(p_tutor_name))
      AND b.status = 'Confirmed'
      AND NOT (b.id = coalesce(p_exclude_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND b.student_id = auth.uid() AND auth.uid() IS NOT NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.booking_slot_capacity(INTEGER, INTEGER, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_slot_capacity(INTEGER, INTEGER, INTEGER, TEXT, TEXT, UUID) TO anon, authenticated;

-- Lock the session before counting, so concurrent checkouts cannot overbook it.
CREATE OR REPLACE FUNCTION public.validate_booking_availability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session public.tutor_sessions%ROWTYPE;
  v_count INTEGER;
  v_private BOOLEAN;
BEGIN
  IF NEW.status <> 'Confirmed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tutor_name IS NOT DISTINCT FROM OLD.tutor_name
      AND NEW.year IS NOT DISTINCT FROM OLD.year AND NEW.month IS NOT DISTINCT FROM OLD.month
      AND NEW.date IS NOT DISTINCT FROM OLD.date AND NEW.slot IS NOT DISTINCT FROM OLD.slot
      AND NEW.mode IS NOT DISTINCT FROM OLD.mode AND NEW.group_size IS NOT DISTINCT FROM OLD.group_size
      AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO v_session FROM public.tutor_sessions s
    WHERE lower(trim(s.tutor_name)) = lower(trim(NEW.tutor_name))
      AND s.year = NEW.year AND s.month = NEW.month AND s.date = NEW.date
      AND to_jsonb(s.slots) ? NEW.slot
    ORDER BY s.id LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR NOT v_session.is_accepting_bookings THEN
    RAISE EXCEPTION 'This session is no longer available. Choose another slot.';
  END IF;
  IF NEW.mode <> v_session.mode THEN RAISE EXCEPTION 'Choose the mode offered by this tutor.'; END IF;
  IF make_date(NEW.year::integer, NEW.month::integer, NEW.date::integer) < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a session on a future date.';
  END IF;
  SELECT count(*), coalesce(bool_or(b.group_size = 'private'), false) INTO v_count, v_private
    FROM public.bookings b
    WHERE lower(trim(b.tutor_name)) = lower(trim(NEW.tutor_name))
      AND b.year = NEW.year AND b.month = NEW.month AND b.date = NEW.date
      AND b.slot = NEW.slot AND b.status = 'Confirmed' AND b.id IS DISTINCT FROM NEW.id;
  IF v_private OR (NEW.group_size = 'private' AND v_count > 0) OR v_count >= v_session.max_capacity THEN
    RAISE EXCEPTION 'This slot is fully booked. Choose another slot.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS bookings_validate_availability ON public.bookings;
CREATE TRIGGER bookings_validate_availability BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_availability();
COMMIT;
NOTIFY pgrst, 'reload schema';
