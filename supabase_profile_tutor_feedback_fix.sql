-- Run after the existing feedback tables/policies have been installed.
-- Extends feedback to profiles.role = 'Tutor' without copying accounts to tutors.
-- Existing feedback IDs, rating limits, author ownership, reply/reaction foreign
-- keys and legacy tutor ratings are preserved. No new tables are created.
BEGIN;

DO $preflight$
DECLARE
  v_table text;
  v_relation regclass;
BEGIN
  IF to_regclass('public.tutors') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'The existing tutors and profiles tables are required.';
  END IF;
  FOREACH v_table IN ARRAY ARRAY['tutor_ratings', 'tutor_comments', 'tutor_comment_reactions'] LOOP
    v_relation := to_regclass('public.' || v_table);
    IF v_relation IS NULL THEN
      RAISE EXCEPTION 'Existing feedback table % is missing. Inspect the installed feedback setup.', v_table;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = v_relation
        AND attname = 'tutor_id' AND atttypid = 'text'::regtype AND NOT attisdropped) THEN
      RAISE EXCEPTION '%.tutor_id must already use text IDs. Send its existing table definition before changing types.', v_table;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_relation) THEN
      RAISE EXCEPTION 'RLS is not enabled on %. Inspect its existing permissions before applying this fix.', v_table;
    END IF;
  END LOOP;
END;
$preflight$;

-- A cross-table tutor identity cannot be expressed as a single foreign key.
-- Replace only single-column tutor_id FKs to the known identity tables with a
-- trigger that validates and locks a real tutor from either source.
CREATE OR REPLACE FUNCTION public.is_profile_feedback_tutor(p_tutor_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  BEGIN
    v_id := p_tutor_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN RETURN false;
  END;
  RETURN EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = v_id AND p.id::text = p_tutor_id AND p.role = 'Tutor');
END;
$$;
REVOKE ALL ON FUNCTION public.is_profile_feedback_tutor(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_profile_feedback_tutor(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_feedback_tutor_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM 1 FROM public.tutors t WHERE t.id = NEW.tutor_id FOR KEY SHARE;
  IF FOUND THEN RETURN NEW; END IF;
  BEGIN
    v_id := NEW.tutor_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Select an existing tutor before leaving feedback.' USING ERRCODE = '23503';
  END;
  PERFORM 1 FROM public.profiles p
    WHERE p.id = v_id AND p.id::text = NEW.tutor_id AND p.role = 'Tutor' FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Select an existing tutor before leaving feedback.' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_feedback_tutor_source() FROM PUBLIC, anon, authenticated;

DO $constraints$
DECLARE
  v_table text;
  v_relation regclass;
  v_tutor_column smallint;
  v_target_column smallint;
  v_constraint record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['tutor_ratings', 'tutor_comments', 'tutor_comment_reactions'] LOOP
    v_relation := ('public.' || v_table)::regclass;
    SELECT attnum INTO v_tutor_column FROM pg_attribute
      WHERE attrelid = v_relation AND attname = 'tutor_id' AND NOT attisdropped;
    FOR v_constraint IN SELECT conname, confrelid, confdeltype, confkey FROM pg_constraint
      WHERE conrelid = v_relation AND contype = 'f' AND conkey = ARRAY[v_tutor_column] LOOP
      SELECT attnum INTO v_target_column FROM pg_attribute
        WHERE attrelid = v_constraint.confrelid AND attname = 'id' AND NOT attisdropped;
      IF v_constraint.confrelid NOT IN ('public.tutors'::regclass, 'public.profiles'::regclass)
          OR v_constraint.confdeltype <> 'c'
          OR v_constraint.confkey IS DISTINCT FROM ARRAY[v_target_column] THEN
        RAISE EXCEPTION 'Unexpected tutor foreign key % on %. Send its definition for a matching patch.',
          v_constraint.conname, v_table;
      END IF;
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', v_table, v_constraint.conname);
    END LOOP;
    EXECUTE format('DROP TRIGGER IF EXISTS validate_feedback_tutor_source ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER validate_feedback_tutor_source BEFORE INSERT OR UPDATE ON public.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.validate_feedback_tutor_source()', v_table);
  END LOOP;
END;
$constraints$;

-- Preserve the old ON DELETE CASCADE behavior when neither tutor source remains.
CREATE OR REPLACE FUNCTION public.cleanup_deleted_tutor_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_tutor_id text := OLD.id::text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = v_tutor_id)
      OR public.is_profile_feedback_tutor(v_tutor_id) THEN RETURN OLD; END IF;
  DELETE FROM public.tutor_comment_reactions WHERE tutor_id = v_tutor_id;
  DELETE FROM public.tutor_comments WHERE tutor_id = v_tutor_id;
  DELETE FROM public.tutor_ratings WHERE tutor_id = v_tutor_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_tutor_feedback() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cleanup_deleted_tutor_feedback ON public.tutors;
CREATE TRIGGER cleanup_deleted_tutor_feedback AFTER DELETE ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_tutor_feedback();
DROP TRIGGER IF EXISTS cleanup_deleted_tutor_feedback ON public.profiles;
CREATE TRIGGER cleanup_deleted_tutor_feedback AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_tutor_feedback();

-- Add only profile-specific policies. Keep all installed legacy policies/grants.
DROP POLICY IF EXISTS "Write own profile tutor rating" ON public.tutor_ratings;
CREATE POLICY "Write own profile tutor rating" ON public.tutor_ratings FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_profile_feedback_tutor(tutor_id));
DROP POLICY IF EXISTS "Update own profile tutor rating" ON public.tutor_ratings;
CREATE POLICY "Update own profile tutor rating" ON public.tutor_ratings FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND public.is_profile_feedback_tutor(tutor_id))
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_profile_feedback_tutor(tutor_id));
DROP POLICY IF EXISTS "Write own profile tutor comment" ON public.tutor_comments;
CREATE POLICY "Write own profile tutor comment" ON public.tutor_comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_profile_feedback_tutor(tutor_id));

COMMIT;
NOTIFY pgrst, 'reload schema';
