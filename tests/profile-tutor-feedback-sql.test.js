const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const driver = process.env.TUTORLINK_PGLITE_PATH
  || path.join(os.tmpdir(), 'TutorLink-sql-verification/node_modules/@electric-sql/pglite');
const hasDriver = fs.existsSync(driver);
const original = fs.readFileSync(path.join(__dirname, '../supabase_feedback.sql'), 'utf8');
const patch = fs.readFileSync(path.join(__dirname, '../supabase_profile_tutor_feedback_fix.sql'), 'utf8');
const teacher = 'd96130e6-002a-41b0-a8f2-b0e6c814a98c';
const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';

const fixtures = `
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users, role text, full_name text);
CREATE TABLE public.tutors (id text PRIMARY KEY, name text NOT NULL);
INSERT INTO auth.users VALUES ('${alice}'), ('${bob}'), ('${teacher}');
INSERT INTO public.profiles VALUES ('${alice}', 'Student', 'Alice'), ('${bob}', 'Student', 'Bob'), ('${teacher}', 'Tutor', 'kasunbandara');
INSERT INTO public.tutors VALUES ('t10', 'Existing Tutor');
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT SELECT ON public.tutors, public.profiles TO anon, authenticated;
`;

test('the profile feedback patch preserves IDs without creating or copying tutor tables', () => {
  assert.doesNotMatch(patch, /CREATE\s+TABLE|INSERT\s+INTO\s+public\.tutors|ALTER\s+COLUMN/i);
  assert.match(patch, /p\.role = 'Tutor'/);
  assert.match(patch, /FOR KEY SHARE/);
});

test('profile Tutor ratings, comments and reactions obey PostgreSQL ownership and identity checks', { skip: !hasDriver }, async (t) => {
  const { PGlite } = require(driver);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(fixtures);
  await db.exec(original);

  async function asUser(id) {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec('SET ROLE authenticated');
  }
  async function rate(tutorId, value, userId = alice) {
    return db.query(`INSERT INTO public.tutor_ratings(tutor_id, user_id, rating)
      VALUES ($1, $2::uuid, $3) ON CONFLICT (tutor_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating RETURNING *`, [tutorId, userId, value]);
  }
  async function comment(tutorId, body, parentId = null, userId = alice) {
    return (await db.query(`INSERT INTO public.tutor_comments(tutor_id, user_id, author_name, body, parent_id)
      VALUES ($1, $2::uuid, 'Learner', $3, $4::uuid) RETURNING *`, [tutorId, userId, body, parentId])).rows[0];
  }
  async function applyPatch() {
    await db.exec('RESET ROLE');
    try { await db.exec(patch); }
    catch (error) { await db.exec('ROLLBACK'); throw error; }
  }

  let legacyComment;
  await t.test('the original installation rejects profile-only feedback but accepts legacy tutors', async () => {
    await asUser(alice);
    await assert.rejects(rate(teacher, 5), /row-level security|foreign key/);
    await rate('t10', 3);
    legacyComment = await comment('t10', 'Existing feedback');
  });

  await t.test('the patch keeps existing feedback, legacy policies, grants and composite foreign keys', async () => {
    await db.exec('RESET ROLE');
    const before = (await db.query('SELECT * FROM public.tutor_ratings')).rows;
    const policies = (await db.query("SELECT policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY policyname")).rows;
    const grants = (await db.query("SELECT relname, relacl::text FROM pg_class WHERE oid IN ('public.tutor_ratings'::regclass, 'public.tutor_comments'::regclass) ORDER BY relname")).rows;
    await applyPatch();
    assert.deepEqual((await db.query('SELECT * FROM public.tutor_ratings')).rows, before);
    assert.deepEqual((await db.query("SELECT relname, relacl::text FROM pg_class WHERE oid IN ('public.tutor_ratings'::regclass, 'public.tutor_comments'::regclass) ORDER BY relname")).rows, grants);
    const after = (await db.query("SELECT policyname FROM pg_policies WHERE schemaname = 'public'")).rows.map(row => row.policyname);
    assert.ok(policies.every(row => after.includes(row.policyname)));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype = 'f' AND array_length(conkey, 1) = 2 AND conrelid IN ('public.tutor_comments'::regclass, 'public.tutor_comment_reactions'::regclass)")).rows[0].count, 2);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutors')).rows[0].count, 1);
  });

  await t.test('a profile-only Tutor can receive and update ratings without duplicating the viewer', async () => {
    await asUser(alice);
    assert.equal((await rate(teacher, 5)).rows[0].tutor_id, teacher);
    assert.equal((await rate(teacher, 4)).rows[0].rating, 4);
    const rows = (await db.query('SELECT * FROM public.tutor_ratings WHERE tutor_id = $1', [teacher])).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, alice);
    await asUser(bob);
    await rate(teacher, 5, bob);
    const summary = (await db.query('SELECT avg(rating)::float AS average, count(*)::int AS total FROM public.tutor_ratings WHERE tutor_id = $1', [teacher])).rows[0];
    assert.deepEqual(summary, { average: 4.5, total: 2 });
  });

  await t.test('a viewer cannot impersonate or change another viewer rating', async () => {
    await asUser(bob);
    await assert.rejects(rate(teacher, 1, alice), /row-level security/);
    const changed = await db.query('UPDATE public.tutor_ratings SET rating = 1 WHERE tutor_id = $1 AND user_id = $2::uuid RETURNING *', [teacher, alice]);
    assert.equal(changed.rows.length, 0);
    assert.equal((await db.query('SELECT rating FROM public.tutor_ratings WHERE tutor_id = $1 AND user_id = $2::uuid', [teacher, alice])).rows[0].rating, 4);
  });

  await t.test('Student targets, unknown IDs and ratings outside 1-5 stay invalid', async () => {
    await asUser(alice);
    for (const id of [alice, 'missing-tutor']) await assert.rejects(rate(id, 5), /existing tutor|row-level security/);
    for (const value of [0, 6]) await assert.rejects(rate(teacher, value), /check constraint/);
    assert.equal((await db.query('SELECT rating FROM public.tutor_ratings WHERE tutor_id = $1 AND user_id = $2::uuid', [teacher, alice])).rows[0].rating, 4);
  });

  let profileComment;
  let reply;
  await t.test('profile comments, one-level replies and reactions retain their same-tutor constraints', async () => {
    profileComment = await comment(teacher, 'Helpful session');
    await asUser(bob);
    reply = await comment(teacher, 'Thanks for sharing', profileComment.id, bob);
    await db.query(`INSERT INTO public.tutor_comment_reactions(tutor_id, comment_id, user_id, kind)
      VALUES ($1, $2::uuid, $3::uuid, 'like')`, [teacher, profileComment.id, bob]);
    await assert.rejects(comment('t10', 'Wrong tutor reply', profileComment.id, bob), /same tutor/);
    await assert.rejects(comment(teacher, 'Too deep', reply.id, bob), /top-level comment/);
    await assert.rejects(db.query(`INSERT INTO public.tutor_comment_reactions(tutor_id, comment_id, user_id, kind)
      VALUES ('t10', $1::uuid, $2::uuid, 'like')`, [reply.id, bob]), /foreign key/);
    const edit = await db.query('UPDATE public.tutor_comments SET body = $1 WHERE id = $2::uuid RETURNING *', ['Tampered', profileComment.id]);
    assert.equal(edit.rows.length, 0);
  });

  await t.test('reapplying the patch preserves all feedback and still permits rating updates', async () => {
    await db.exec('RESET ROLE');
    const before = (await db.query('SELECT * FROM public.tutor_ratings ORDER BY tutor_id, user_id')).rows;
    await applyPatch();
    assert.deepEqual((await db.query('SELECT * FROM public.tutor_ratings ORDER BY tutor_id, user_id')).rows, before);
    await asUser(alice);
    await rate(teacher, 5);
  });

  await t.test('anonymous writes remain denied', async () => {
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(rate(teacher, 1), /permission denied/);
    await db.exec('RESET ROLE');
  });

  await t.test('deleting a legacy tutor cascades only its own feedback', async () => {
    await db.query("DELETE FROM public.tutors WHERE id = 't10'");
    assert.equal((await db.query("SELECT count(*)::int AS count FROM public.tutor_ratings WHERE tutor_id = 't10'")).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutor_comments WHERE id = $1::uuid', [legacyComment.id])).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutor_ratings WHERE tutor_id = $1', [teacher])).rows[0].count, 2);
  });

  await t.test('feedback survives removing one source of the same ID and cascades when its last source is removed', async () => {
    await db.query('INSERT INTO public.tutors(id, name) VALUES ($1, $2)', [teacher, 'kasunbandara']);
    await db.query('DELETE FROM public.profiles WHERE id = $1::uuid', [teacher]);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutor_ratings WHERE tutor_id = $1', [teacher])).rows[0].count, 2);
    await db.query('DELETE FROM public.tutors WHERE id = $1', [teacher]);
    for (const table of ['tutor_ratings', 'tutor_comments', 'tutor_comment_reactions']) {
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM public.${table} WHERE tutor_id = $1`, [teacher])).rows[0].count, 0);
    }
  });

  await t.test('a deleted profile-only Tutor leaves no orphan ratings', async () => {
    await db.query('INSERT INTO public.profiles(id, role, full_name) VALUES ($1::uuid, $2, $3)', [teacher, 'Tutor', 'kasunbandara']);
    await asUser(alice);
    await rate(teacher, 5);
    await comment(teacher, 'Another session');
    await db.exec('RESET ROLE');
    await db.query('DELETE FROM public.profiles WHERE id = $1::uuid', [teacher]);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutor_ratings WHERE tutor_id = $1', [teacher])).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.tutor_comments WHERE tutor_id = $1', [teacher])).rows[0].count, 0);
  });

  await t.test('an unexpected tutor foreign key is retained and the patch rolls back', async () => {
    await db.exec(`CREATE TABLE public.custom_tutor_ids(id text PRIMARY KEY);
      ALTER TABLE public.tutor_ratings ADD CONSTRAINT custom_tutor_fk
        FOREIGN KEY (tutor_id) REFERENCES public.custom_tutor_ids(id) ON DELETE CASCADE;`);
    await assert.rejects(applyPatch(), /Unexpected tutor foreign key/);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = 'public.tutor_ratings'::regclass AND conname = 'custom_tutor_fk'")).rows[0].count, 1);
    await db.exec('ALTER TABLE public.tutor_ratings DROP CONSTRAINT custom_tutor_fk');
  });

  await t.test('a setup without RLS stops before changing permissions or constraints', async () => {
    await db.exec('ALTER TABLE public.tutor_ratings DISABLE ROW LEVEL SECURITY');
    await assert.rejects(applyPatch(), /RLS is not enabled/);
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tutor_ratings'::regclass")).rows[0].relrowsecurity, false);
  });
});
