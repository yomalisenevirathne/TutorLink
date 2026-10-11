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

The application uses real authentication by default. Optional classroom demo
login can be enabled with `EXPO_PUBLIC_ENABLE_DEMO_AUTH=true`. It does not create
a real tutor identity. Supabase OTP emails must include `{{ .Token }}` and use
six digits for the verification screen.

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
