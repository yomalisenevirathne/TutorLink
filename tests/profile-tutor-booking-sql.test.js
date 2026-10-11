const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Optional local PostgreSQL verification tool; it is not an app dependency.
// Set TUTORLINK_PGLITE_PATH to a separately installed @electric-sql/pglite.
const driver = process.env.TUTORLINK_PGLITE_PATH
  || path.join(os.tmpdir(), 'TutorLink-sql-verification/node_modules/@electric-sql/pglite');
const hasDriver = fs.existsSync(driver);
const sql = fs.readFileSync(path.join(__dirname, '../supabase_booking_payments.sql'), 'utf8').replace(/\r\n/g, '\n');
const patch = fs.readFileSync(path.join(__dirname, '../supabase_profile_tutor_booking_fix.sql'), 'utf8').replace(/\r\n/g, '\n');
const oldLookup = patch.match(/\$old_lookup\$([\s\S]*?)\$old_lookup\$/)[1].trim();
const newLookup = patch.match(/\$new_lookup\$([\s\S]*?)\$new_lookup\$/)[1].trim();
const legacySql = sql.replace(newLookup, oldLookup);

const owner = '00000000-0000-0000-0000-000000000001';
const tutor = 'd96130e6-002a-41b0-a8f2-b0e6c814a98c';
const otherStudent = '00000000-0000-0000-0000-000000000002';
const cardId = '00000000-0000-0000-0000-000000000010';
const booking = { tutorId: tutor, tutorName: 'kasunbandara', subject: 'Programming',
  year: 2030, month: 5, date: 19, slot: '7:00 PM', mode: 'online', groupSize: 'small',
  sessionFee: 399, platformFee: 50, total: 449, bookerName: 'Booking Student', rescheduleId: null };

const fixtures = `
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users, role text,
  full_name text NOT NULL, email text, avatar_url text, about_you text);
CREATE TABLE public.tutors (id text PRIMARY KEY, name text NOT NULL,
  photo_url text, "photoUrl" text, user_id uuid);
CREATE TABLE public.payment_methods (id uuid PRIMARY KEY, user_id uuid NOT NULL, brand text, last4 text);
CREATE TABLE public.bookings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid, tutor_id uuid, tutor_name text, subject text,
  year integer, month integer, date integer NOT NULL, slot text NOT NULL, session_date date,
  mode text, group_size text, total_fee numeric, session_fee numeric, platform_fee numeric,
  status text DEFAULT 'Confirmed', created_at timestamptz DEFAULT now());
CREATE TABLE public.demo_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users, reference text NOT NULL,
  counterparty_name text, amount numeric, currency text DEFAULT 'LKR', status text DEFAULT 'Demo',
  subject text, session_date date, session_time text, card_brand text, card_last4 text,
  occurred_at timestamptz DEFAULT now(), UNIQUE (user_id, reference));
INSERT INTO auth.users(id) VALUES ('${owner}'), ('${tutor}'), ('${otherStudent}');
INSERT INTO public.profiles VALUES
  ('${owner}', 'Student', 'Booking Student', 'student@example.com', null, null),
  ('${tutor}', 'Tutor', 'kasunbandara', 'kasunbandara@gmail.com', 'https://example.com/kasun.jpg', null),
  ('${otherStudent}', 'Student', 'Other Student', 'other@example.com', null, null);
INSERT INTO public.tutors VALUES ('t10', 'Legacy Tutor', null, 'https://example.com/legacy.jpg', null);
INSERT INTO public.payment_methods VALUES ('${cardId}', '${owner}', 'Visa', '1111');
GRANT USAGE ON SCHEMA public, auth TO authenticated;
`;

test('the patch contains only a guarded change to the existing payment function', () => {
  assert.notEqual(legacySql, sql);
  assert.ok(legacySql.includes(oldLookup));
  assert.doesNotMatch(patch, /CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+POLICY|INSERT\s+INTO\s+public\.tutors/i);
  assert.match(newLookup, /p\.role = 'Tutor'/);
  assert.match(newLookup, /p\.id::text = nullif\(p_booking->>'tutorId', ''\)/);
});

test('profile tutor checkout executes atomically in PostgreSQL', { skip: !hasDriver }, async (t) => {
  const { PGlite } = require(driver);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(fixtures);
  // Preserve a teammate's unrelated function setting and body comment.
  await db.exec(legacySql.replace('AS $$', () => "SET statement_timeout = '5s'\nAS $$")
    .replace('BEGIN\n  IF v_owner', 'BEGIN\n  -- Existing team customization remains.\n  IF v_owner')
    .replace(/ {2}/g, '\t').replace(/\n/g, '\r\n'));
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [owner]);

  async function confirm(reference, data = booking) {
    const result = await db.query('SELECT public.record_booking_payment($1, $2::uuid, $3::jsonb) AS result',
      [reference, cardId, JSON.stringify(data)]);
    return result.rows[0].result;
  }
  async function applyPatch() {
    try { await db.exec(patch); }
    catch (error) { await db.exec('ROLLBACK'); throw error; }
  }
  async function counts() {
    return (await db.query('SELECT (SELECT count(*) FROM public.bookings)::int AS bookings, '
      + '(SELECT count(*) FROM public.demo_payments)::int AS payments, '
      + '(SELECT count(*) FROM public.tutors)::int AS tutors')).rows[0];
  }
  async function attributes() {
    return (await db.query("SELECT proowner, proacl::text, prosecdef, proconfig FROM pg_proc "
      + "WHERE oid = 'public.record_booking_payment(text,uuid,jsonb)'::regprocedure")).rows[0];
  }

  await t.test('the unpatched function reproduces the reported profile-only tutor failure', async () => {
    await assert.rejects(confirm('DEMO-BEFORE-0001'), /Please select a tutor profile before booking/);
    assert.deepEqual(await counts(), { bookings: 0, payments: 0, tutors: 1 });
  });

  await t.test('the lookup patch preserves ownership, grants, settings, custom behavior and existing tables', async () => {
    const before = await attributes();
    await applyPatch();
    assert.deepEqual(await attributes(), before);
    const source = (await db.query("SELECT prosrc FROM pg_proc WHERE oid = 'public.record_booking_payment(text,uuid,jsonb)'::regprocedure")).rows[0].prosrc;
    assert.match(source, /Existing team customization remains/);
    assert.match(source, /PROFILE_TUTOR_BOOKING_V1/);
    assert.deepEqual(await counts(), { bookings: 0, payments: 0, tutors: 1 });
  });

  let saved;
  await t.test('profile UUIDs produce linked booking and payment records with the actual tutor account owner', async () => {
    saved = await confirm('DEMO-PROFILE-0001');
    assert.equal(saved.payment.amount, 449);
    assert.equal(saved.payment.tutor_id, tutor);
    assert.equal(saved.payment.counterparty_name, 'kasunbandara');
    assert.equal(saved.payment.counterparty_avatar_url, 'https://example.com/kasun.jpg');
    assert.equal(saved.booking.tutor_id, tutor);
    assert.equal(saved.booking.discovery_tutor_id, tutor);
    assert.equal(saved.booking.student_id, owner);
    assert.equal(saved.booking.month, 6);
    assert.equal(saved.booking.status, 'Confirmed');
    assert.equal(saved.payment.booking_id, saved.booking.id);
    assert.equal(saved.payment.booker_name, 'Booking Student');
    assert.deepEqual(await counts(), { bookings: 1, payments: 1, tutors: 1 });
    const mine = await db.query('SELECT id FROM public.bookings WHERE tutor_id = $1::uuid', [tutor]);
    assert.equal(mine.rows[0].id, saved.booking.id);
  });

  await t.test('retrying the same reference does not duplicate the booking or payment', async () => {
    const retried = await confirm('DEMO-PROFILE-0001');
    assert.equal(retried.booking.id, saved.booking.id);
    assert.equal(retried.payment.id, saved.payment.id);
    assert.deepEqual(await counts(), { bookings: 1, payments: 1, tutors: 1 });
  });

  await t.test('authenticated execution works while anonymous and signed-out calls remain blocked', async () => {
    await db.exec('SET ROLE authenticated');
    assert.equal((await confirm('DEMO-PROFILE-0001')).booking.id, saved.booking.id);
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    await assert.rejects(confirm('DEMO-SIGNEDOUT-0001'), /Sign in before confirming a booking/);
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(confirm('DEMO-ANON-0001'), /permission denied/);
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [owner]);
  });

  await t.test('existing text tutor IDs and their snapshots still work', async () => {
    const legacy = await confirm('DEMO-LEGACY-0001', { ...booking, tutorId: 't10', tutorName: 'Legacy Tutor' });
    assert.equal(legacy.payment.tutor_id, 't10');
    assert.equal(legacy.booking.discovery_tutor_id, 't10');
    assert.equal(legacy.payment.counterparty_avatar_url, 'https://example.com/legacy.jpg');
  });

  await t.test('Student accounts, missing IDs and changed tutor names cannot confirm a booking', async () => {
    const before = await counts();
    for (const [index, data] of [
      { ...booking, tutorId: otherStudent, tutorName: 'Other Student' },
      { ...booking, tutorId: 'not-a-tutor', tutorName: 'Legacy Tutor' },
      { ...booking, tutorId: null },
      { ...booking, tutorName: 'Wrong Name' },
    ].entries()) {
      await assert.rejects(confirm(`DEMO-INVALID-${index}`, data), /select a tutor|details changed/);
    }
    assert.deepEqual(await counts(), before);
  });

  await t.test('only the authenticated owner can use a card or reschedule a booking', async () => {
    const before = await counts();
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [otherStudent]);
    await assert.rejects(confirm('DEMO-FOREIGN-0001'), /saved cards/);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [owner]);
    const otherBooking = await db.query(`INSERT INTO public.bookings(student_id, tutor_id, date, slot)
      VALUES ($1::uuid, $2::uuid, 19, '7:00 PM') RETURNING id`, [otherStudent, tutor]);
    await assert.rejects(confirm('DEMO-FOREIGN-0002', { ...booking, rescheduleId: otherBooking.rows[0].id }), /Only your own booking/);
    assert.deepEqual(await counts(), { ...before, bookings: before.bookings + 1 });
    const rescheduled = await confirm('DEMO-RESCHEDULE-0001', { ...booking, rescheduleId: saved.booking.id, slot: '8:00 PM' });
    assert.equal(rescheduled.booking.id, saved.booking.id);
    assert.equal(rescheduled.booking.slot, '8:00 PM');
  });

  await t.test('a payment insert failure rolls back its booking instead of leaving an orphan', async () => {
    await db.exec(`CREATE FUNCTION public.fail_test_payment() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.reference = 'DEMO-FAIL-0001' THEN RAISE EXCEPTION 'Simulated payment failure'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER fail_payment BEFORE INSERT ON public.demo_payments FOR EACH ROW EXECUTE FUNCTION public.fail_test_payment();`);
    const before = await counts();
    await assert.rejects(confirm('DEMO-FAIL-0001'), /Simulated payment failure/);
    assert.deepEqual(await counts(), before);
  });

  await t.test('reapplying the patch makes no further function or data changes', async () => {
    const definition = (await db.query("SELECT pg_get_functiondef('public.record_booking_payment(text,uuid,jsonb)'::regprocedure) AS definition")).rows[0].definition;
    const before = await counts();
    await applyPatch();
    assert.equal((await db.query("SELECT pg_get_functiondef('public.record_booking_payment(text,uuid,jsonb)'::regprocedure) AS definition")).rows[0].definition, definition);
    assert.deepEqual(await counts(), before);
  });

  await t.test('an unrecognized installed lookup is left intact rather than overwritten', async () => {
    await db.exec(legacySql.replace('trim(t.name)', 'btrim(t.name)'));
    const definition = (await db.query("SELECT pg_get_functiondef('public.record_booking_payment(text,uuid,jsonb)'::regprocedure) AS definition")).rows[0].definition;
    await assert.rejects(applyPatch(), /installed tutor lookup differs/);
    assert.equal((await db.query("SELECT pg_get_functiondef('public.record_booking_payment(text,uuid,jsonb)'::regprocedure) AS definition")).rows[0].definition, definition);
  });
});
