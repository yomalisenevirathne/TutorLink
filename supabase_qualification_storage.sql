-- Optional, unverified proposal retained for review; not an integration prerequisite.
-- Confirm the profile feature's existing storage before creating another bucket.
-- Documents stay private. Each authenticated account can access its own folder.
BEGIN;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('qualifications', 'qualifications', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Upload own qualifications" ON storage.objects;
CREATE POLICY "Upload own qualifications" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qualifications' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Read own qualifications" ON storage.objects;
CREATE POLICY "Read own qualifications" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'qualifications' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Delete own qualifications" ON storage.objects;
CREATE POLICY "Delete own qualifications" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qualifications' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
COMMIT;
