Payment History now displays the selected tutor's full name, subject and the
person who booked the session. Checkout receives these details from the booking
summary instead of a fixed tutor and subject.

Run [supabase_booking_payments.sql](./supabase_booking_payments.sql) in the same
Supabase project's SQL Editor. The existing `bookings`, `tutors`, `profiles`,
`payment_methods` and `demo_payments` tables must already exist. The payment
method and demo payment setup scripts provide the last two tables.

The migration adds booking IDs, tutor IDs and booker names to payment history.
It also creates `record_booking_payment`, which saves the reservation and its
confirmation together. The caller must be authenticated and must own the chosen
saved card. Tutor names and photos come from the selected database tutor. Booker
names come from the authenticated profile, with a checkout name snapshot for
prototype accounts. Repeating the same reference reuses the original booking.
Rescheduling updates only a booking owned by the caller.

After running the migration, choose a tutor, book a session and complete the
payment flow. Verify that My Bookings contains the reservation and Payment
History contains its tutor, subject and booker name. The `demo_payments` row
contains `booking_id`, `tutor_id`, `booker_name`, `counterparty_name`, `subject`,
`session_date` and `session_time`.

The history card's Demo label has been removed. Existing confirmations retain
their stored transaction type; this change does not charge cards or turn
prototype confirmations into gateway transactions. Old rows without a booking
link retain their recorded names and subjects. Their original tutor cannot be
reconstructed reliably from the old hard-coded checkout values.

The public API key in `.env.local` cannot apply schema migrations. Run this file
with SQL Editor access; do not place database admin credentials in the mobile app.
