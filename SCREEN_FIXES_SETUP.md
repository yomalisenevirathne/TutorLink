# Existing backend integration and verification

The supplied definitions confirm that `public.bookings` and
`public.tutor_sessions` already contain the columns used by the booking screens.
The integration uses those tables directly. No new table, availability RPC,
trigger, or storage bucket is required for the booking-screen changes.

The previously proposed `supabase_booking_availability.sql` and
`supabase_qualification_storage.sql` are optional proposals only. They have not
been applied or verified against the live project. Do not run them as a required
integration step. Review database changes with the owner of the existing feature.

## Current behavior and limits

- Discovery and the tutor feedback list read `tutors` together with `profiles`
  filtered to `role = 'Tutor'`. `tutor_profiles` supplies optional subjects, rates,
  and verification details. Records are deduplicated by account ID or normalized
  email; existing listing IDs are retained. No row copy or schema migration is
  required to display registered tutors. Home keeps its six-card recommendations;
  See all clears filters and opens the full merged list.
- The existing RLS policies must permit the signed-in viewer to read other Tutor
  profiles. SQL Editor results alone do not establish app access. Read failures
  display a retry message; policies that silently restrict rows still limit the
  visible directory. No permissions are changed by these code changes.
- The feedback UI accepts both listing and Tutor account IDs. The targeted
  `supabase_profile_tutor_feedback_fix.sql` enables those profile UUIDs in the
  existing feedback backend while preserving rating limits and viewer ownership.
- Session saves update existing rows for the same tutor/date, including removed
  slots, rather than inserting another record on every save.
- Calendar queries show only the selected tutor's configured slots. Tutor session
  dates and booking database months use 1-12; JavaScript calendar months use 0-11.
- My Bookings filters by `student_id` or `tutor_id`. Existing records with null
  owner IDs cannot be reliably assigned to an account; do not guess an owner.
- Availability reads matching Confirmed rows from the existing `bookings` table
  using the existing authentication and RLS policies. The supplied CREATE TABLE
  statements do not establish what those policies permit. If students can only
  read their own bookings, these counts do not include other students' bookings.
  Global availability and concurrent booking protection must be verified against
  the existing backend with its owner; frontend counts cannot guarantee either.
- Qualification uploads are separate from booking integration. They use the
  existing bucket named by `EXPO_PUBLIC_QUALIFICATION_BUCKET`; no bucket name is
  assumed. Confirm that bucket and its access rules with the profile feature
  owner before configuring uploads. Documents are marked Pending.
- The existing prototype payment flow does not charge cards. Its existing
  `record_booking_payment` integration remains in use; inspect its installed
  function and permissions rather than applying migrations blindly.

## Booking a Tutor account without a discovery listing

The existing payment RPC originally resolved IDs only against `public.tutors`.
That produces `Please select a tutor profile before booking.` for a tutor listed
from `profiles` alone, even though discovery and the calendar can display them.

For an existing installation, copy the entire
`supabase_profile_tutor_booking_fix.sql` into the same Supabase project's SQL
Editor and run it, then retry the failed confirmation. This patch reads the
installed function definition and changes only its known tutor lookup block.
The fallback accepts an exact `profiles.id` with `role = 'Tutor'`; it records that
UUID in `bookings.tutor_id` and the same text ID in the payment snapshot. No tutor
row copy, table migration, RLS change or client-side payment insert is required.
Ownership checks, retries and booking/payment transaction behavior stay in the
installed function. Applying the patch twice is safe.

If the installed function has a different lookup, the patch stops without
replacing it. Retrieve its definition for a matching patch:

```sql
SELECT pg_get_functiondef(
  'public.record_booking_payment(text,uuid,jsonb)'::regprocedure
);
```

The canonical `supabase_booking_payments.sql` also includes the corrected lookup
for future installations. Existing installations should use the targeted patch
above. The targeted patch has been tested in an isolated local PostgreSQL engine;
it has not been applied to the live Supabase project by this agent.

Optional SQL tests use a separately installed `@electric-sql/pglite` package at
`TUTORLINK_PGLITE_PATH` (or the temporary TutorLink SQL verification directory).
They reproduce the original failure, verify both Tutor sources, deny Student
profiles and foreign cards, and check retries, rescheduling and rollback.

## Ratings for Tutor accounts without a discovery listing

Copy all of `supabase_profile_tutor_feedback_fix.sql` into the same Supabase
project's SQL Editor, run it, then refresh the app and open the Tutor's feedback.
Both Tutor sources use the existing `tutor_ratings`, `tutor_comments`, and
`tutor_comment_reactions` tables. No tutor row copy or new table is required.

The patch replaces only single-column cascading tutor identity foreign keys
with validation triggers that accept an existing listing ID or an exact Tutor
profile UUID. Author foreign keys, same-tutor reply/reaction foreign keys, rating
limits and existing data stay in place. Source-row locks and delete cleanup
maintain tutor identity integrity. Added profile-specific RLS policies let the
verified viewer insert/update only their own rating and insert their own
comments; existing policies, grants and other restrictions remain installed.

The patch stops for missing feedback tables, incompatible tutor ID types,
disabled RLS or an unrecognized tutor foreign key. If it stops, inspect/send that
table's existing definition rather than running the full feedback setup blindly.
Repeated application is supported. Local PostgreSQL tests cover ratings,
updates, ownership, legacy IDs, comments, replies, reactions and deletion cleanup.
The patch has not been applied to the live Supabase project by this agent.

## Interpreting the provided startup logs

The web SecureStore exception and REST calls to localhost in the provided logs
refer to earlier code paths. The current Supabase client selects browser storage
on web and SecureStore on native. Registration and login now use the same Supabase identity. Neither calls the
local `/auth/register` or `/auth/login` endpoint; a separate REST account cannot
authenticate requests to the existing Supabase booking tables.

Stop the currently running Expo process with Ctrl+C, then restart from this
project directory:

```powershell
npm start -- --clear
```

Reload the browser or reconnect Expo Go, reproduce the issue, and inspect the new
log entries. Clearing Metro's cache does not change database data. See the
[Expo Windows cache guide](https://docs.expo.dev/troubleshooting/clear-cache-windows/).

If using a separate REST feature on a physical phone, localhost points to that
phone. Use the backend owner's reachable URL in `EXPO_PUBLIC_API_URL` and confirm
the backend is running. Supabase registration and login do not require that REST server.

Tutor registration uses demo OTP **123456**. Enter any correctly formatted email
address (no university domain or existing mailbox is required), tap **verify email**,
then enter the code. Resend creates the same code, valid for ten minutes. Verification
opens above the form so returning does not discard the name, subjects or attachments.
This code does not send email or create a Supabase session.

To save these accounts in the existing Supabase database without receiving email:

1. Open **Authentication > Sign In / Providers > Email** in the Supabase dashboard.
2. Turn off **Confirm email**, keep email sign-up enabled, and save the setting.
3. In the app, verify demo OTP **123456**, then tap **Create Account**.

The app still creates a real Supabase Auth user and saves `profiles` (role `Tutor`)
and `tutor_profiles` under that user's UUID. The merged directory displays this
account alongside existing `tutors` rows. Registration no longer requires inserting
a duplicate legacy listing. The existing tutor form uses password `password123`;
use the supplied email and that password to sign in again. Existing emails remain
subject to Supabase's account uniqueness rules. If Supabase returns no authenticated
session, the app shows the configuration instructions instead of reporting a saved
profile. This dashboard setting has not been changed by the agent; it applies to
email sign-ups across the project, including student sign-ups.

See [Supabase's Confirm Email configuration](https://supabase.com/docs/guides/auth/general-configuration).
Other email verification flows still use Supabase OTP; those email templates must
include `{{ .Token }}` and use six digits. Optional classroom demo login can be enabled
with `EXPO_PUBLIC_ENABLE_DEMO_AUTH=true`; that fallback does not create a database identity.

## Manual checks

1. Sign in with a student and tutor account; check the Account and Bookings tabs.
2. Save a tutor session twice, refresh, and confirm its current slots and fees.
3. Switch calendar months and dates; previous slot selections must be cleared.
4. Reopen My Bookings after payment using the same account, then another account.
5. Confirm the existing RLS policies before interpreting cross-user availability.
6. Paste an OTP and test failed verification and resend requests.
7. Edit a saved card and switch between tutors' feedback screens.

Local lint, typecheck, and automated tests verify code behavior with mocked
services. They do not verify the live database policies or a physical device.
