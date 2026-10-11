-- Run in Supabase SQL Editor to allow bookings for profiles.role = 'Tutor'.
-- Patches only the existing record_booking_payment tutor lookup. The rest of
-- its installed body, transaction checks, function settings and grants survive.
-- No table definitions, existing records or RLS policies are changed.
BEGIN;

DO $patch$
DECLARE
  v_function regprocedure := to_regprocedure('public.record_booking_payment(text,uuid,jsonb)');
  v_definition text;
  v_updated text;
  v_pattern text;
  v_old_lookup text := $old_lookup$
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
$old_lookup$;
  v_new_lookup text := $new_lookup$
  BEGIN
    -- PROFILE_TUTOR_BOOKING_V1: resolve listing IDs first, then Tutor account UUIDs.
    SELECT t.id::text, trim(t.name), coalesce(t.photo_url, t."photoUrl"), t.user_id
      INTO STRICT v_tutor_id, v_tutor_name, v_tutor_photo, v_tutor_user
      FROM public.tutors t
      WHERE (nullif(p_booking->>'tutorId', '') IS NOT NULL
          AND t.id::text = p_booking->>'tutorId')
        OR (nullif(p_booking->>'tutorId', '') IS NULL
          AND lower(trim(t.name)) = lower(trim(p_booking->>'tutorName')));
  EXCEPTION
    WHEN no_data_found THEN
      SELECT p.id::text, trim(p.full_name), p.avatar_url, p.id
        INTO v_tutor_id, v_tutor_name, v_tutor_photo, v_tutor_user
        FROM public.profiles p
        WHERE p.role = 'Tutor'
          AND p.id::text = nullif(p_booking->>'tutorId', '');
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Please select a tutor profile before booking.';
      END IF;
    WHEN too_many_rows THEN
      RAISE EXCEPTION 'Please select a tutor profile before booking.';
  END;
$new_lookup$;
BEGIN
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'record_booking_payment is missing. Inspect the existing payment setup before applying this fix.';
  END IF;
  v_definition := pg_get_functiondef(v_function);
  IF position('PROFILE_TUTOR_BOOKING_V1' in v_definition) > 0 THEN
    RAISE NOTICE 'The Tutor profile booking fix is already installed.';
    RETURN;
  END IF;

  -- Escape regex metacharacters, then allow different indentation/newlines.
  v_pattern := regexp_replace(v_old_lookup, $regex$([\[\]{}().*+?^$|\\])$regex$, $escape$\\\1$escape$, 'g');
  v_pattern := regexp_replace(v_pattern, '[[:space:]]+', '[[:space:]]+', 'g');
  v_updated := regexp_replace(v_definition, v_pattern, v_new_lookup);
  IF v_updated = v_definition THEN
    RAISE EXCEPTION 'The installed tutor lookup differs from this patch. Send the result of SELECT pg_get_functiondef(''public.record_booking_payment(text,uuid,jsonb)''::regprocedure); for a matching fix.';
  END IF;
  EXECUTE v_updated;
END;
$patch$;

COMMIT;
NOTIFY pgrst, 'reload schema';
