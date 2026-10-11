-- Run in this project's Supabase SQL Editor before using shared feedback.
-- Feedback uses public.tutors text IDs (for example t10).
-- Existing feedback, tutor profiles, tutors, and payment data are preserved.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tutor_ratings (
  tutor_id TEXT NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tutor_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tutor_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id TEXT NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 100),
  avatar_url TEXT,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
  parent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tutor_id),
  FOREIGN KEY (parent_id, tutor_id) REFERENCES public.tutor_comments(id, tutor_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tutor_comments_history_idx ON public.tutor_comments(tutor_id, created_at, id);

CREATE TABLE IF NOT EXISTS public.tutor_comment_reactions (
  tutor_id TEXT NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('like', 'dislike')),
  PRIMARY KEY (comment_id, user_id),
  FOREIGN KEY (comment_id, tutor_id) REFERENCES public.tutor_comments(id, tutor_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tutor_comment_reactions_tutor_idx ON public.tutor_comment_reactions(tutor_id, comment_id, user_id);

-- Upgrade the earlier profiles/UUID schema without deleting or guessing how to
-- remap its feedback. Legacy UUIDs remain as text; new feedback uses tutors.id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('tutor_ratings', 'tutor_comments', 'tutor_comment_reactions')
      AND column_name = 'tutor_id' AND data_type = 'uuid'
  ) THEN
    -- Policies and composite foreign keys depend on the old column types.
    DROP POLICY IF EXISTS "Write own tutor rating" ON public.tutor_ratings;
    DROP POLICY IF EXISTS "Update own tutor rating" ON public.tutor_ratings;
    DROP POLICY IF EXISTS "Write own tutor comment" ON public.tutor_comments;
    ALTER TABLE public.tutor_comments DROP CONSTRAINT IF EXISTS tutor_comments_parent_id_tutor_id_fkey;
    ALTER TABLE public.tutor_comment_reactions DROP CONSTRAINT IF EXISTS tutor_comment_reactions_comment_id_tutor_id_fkey;
    ALTER TABLE public.tutor_ratings DROP CONSTRAINT IF EXISTS tutor_ratings_tutor_id_fkey;
    ALTER TABLE public.tutor_comments DROP CONSTRAINT IF EXISTS tutor_comments_tutor_id_fkey;
    ALTER TABLE public.tutor_comment_reactions DROP CONSTRAINT IF EXISTS tutor_comment_reactions_tutor_id_fkey;

    ALTER TABLE public.tutor_ratings ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::text;
    ALTER TABLE public.tutor_comments ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::text;
    ALTER TABLE public.tutor_comment_reactions ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::text;

    -- NOT VALID preserves old profile feedback while enforcing tutors.id for
    -- every new row. Legacy rows are not attached to unrelated t10/t11 tutors.
    ALTER TABLE public.tutor_ratings ADD CONSTRAINT tutor_ratings_tutor_id_fkey
      FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.tutor_comments ADD CONSTRAINT tutor_comments_tutor_id_fkey
      FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.tutor_comment_reactions ADD CONSTRAINT tutor_comment_reactions_tutor_id_fkey
      FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.tutor_comments ADD CONSTRAINT tutor_comments_parent_id_tutor_id_fkey
      FOREIGN KEY (parent_id, tutor_id) REFERENCES public.tutor_comments(id, tutor_id) ON DELETE CASCADE;
    ALTER TABLE public.tutor_comment_reactions ADD CONSTRAINT tutor_comment_reactions_comment_id_tutor_id_fkey
      FOREIGN KEY (comment_id, tutor_id) REFERENCES public.tutor_comments(id, tutor_id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.tutor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_comment_reactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tutor_ratings, public.tutor_comments, public.tutor_comment_reactions FROM anon, authenticated;
GRANT SELECT ON public.tutor_ratings, public.tutor_comments, public.tutor_comment_reactions TO anon, authenticated;
GRANT INSERT (tutor_id, user_id, rating), UPDATE (tutor_id, user_id, rating) ON public.tutor_ratings TO authenticated;
GRANT INSERT (tutor_id, user_id, author_name, avatar_url, body, parent_id) ON public.tutor_comments TO authenticated;
GRANT UPDATE (body), DELETE ON public.tutor_comments TO authenticated;
GRANT INSERT (tutor_id, comment_id, user_id, kind), UPDATE (tutor_id, comment_id, user_id, kind), DELETE ON public.tutor_comment_reactions TO authenticated;
GRANT ALL ON public.tutor_ratings, public.tutor_comments, public.tutor_comment_reactions TO service_role;

DROP POLICY IF EXISTS "Read tutor ratings" ON public.tutor_ratings;
CREATE POLICY "Read tutor ratings" ON public.tutor_ratings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Write own tutor rating" ON public.tutor_ratings;
CREATE POLICY "Write own tutor rating" ON public.tutor_ratings FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id));
DROP POLICY IF EXISTS "Update own tutor rating" ON public.tutor_ratings;
CREATE POLICY "Update own tutor rating" ON public.tutor_ratings FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id));

DROP POLICY IF EXISTS "Read tutor comments" ON public.tutor_comments;
CREATE POLICY "Read tutor comments" ON public.tutor_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Write own tutor comment" ON public.tutor_comments;
CREATE POLICY "Write own tutor comment" ON public.tutor_comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id));
DROP POLICY IF EXISTS "Edit own tutor comment" ON public.tutor_comments;
CREATE POLICY "Edit own tutor comment" ON public.tutor_comments FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Delete own tutor comment" ON public.tutor_comments;
CREATE POLICY "Delete own tutor comment" ON public.tutor_comments FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- A trigger checks reply depth without a self-referencing RLS policy.
CREATE OR REPLACE FUNCTION public.check_tutor_feedback_reply()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tutor_comments c
    WHERE c.id = NEW.parent_id AND c.tutor_id = NEW.tutor_id AND c.parent_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Reply must belong to a top-level comment for the same tutor';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS check_tutor_feedback_reply ON public.tutor_comments;
CREATE TRIGGER check_tutor_feedback_reply BEFORE INSERT ON public.tutor_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_tutor_feedback_reply();

DROP POLICY IF EXISTS "Read tutor reactions" ON public.tutor_comment_reactions;
CREATE POLICY "Read tutor reactions" ON public.tutor_comment_reactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Write own tutor reaction" ON public.tutor_comment_reactions;
CREATE POLICY "Write own tutor reaction" ON public.tutor_comment_reactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Update own tutor reaction" ON public.tutor_comment_reactions;
CREATE POLICY "Update own tutor reaction" ON public.tutor_comment_reactions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Remove own tutor reaction" ON public.tutor_comment_reactions;
CREATE POLICY "Remove own tutor reaction" ON public.tutor_comment_reactions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

COMMIT;
NOTIFY pgrst, 'reload schema';
