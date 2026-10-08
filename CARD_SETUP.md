# Add Card setup

The flow is **Booking Summary → Pay → Payment → Add New Card → Save Card → Payment**.

Run `supabase_payment_methods.sql` in the Supabase SQL Editor for the same project used by `src/utils/supabase.js`. It also updates installations that ran the earlier read-only migration. Sign in with a real registered Supabase account; demo accounts cannot write records.

The form checks card brand, Luhn checksum, expiry, security-code length, name and save consent. Only `user_id`, brand, last four digits, expiry and cardholder name are sent to Supabase. The owner comes from the verified Supabase session. Row-level security restricts reads and inserts to that owner. A successful database insert refreshes the saved cards on Payment; a failed insert stays on Add Card with an error.

This prototype saves masked display details. It does not create a chargeable provider token, verify ownership of a bank card or charge money. Full card numbers and CVV are never sent to the app backend or database. For real payments, replace local card inputs with the chosen provider's secure card SDK and save its verified token using a trusted backend.

Verify with `npm run lint`, `npm run typecheck` and `npm test`. Browser checks can exercise both successful inserts and database failures with test data. A mocked insert is not proof that the hosted database migration has been applied.
