# Add Card setup

The flow is **Booking Summary → Pay → Payment → Add New Card → Save Card → Payment**.

Run `supabase_payment_methods.sql` in the Supabase SQL Editor for the same project used by `src/utils/supabase.js`. It also updates installations that ran the earlier read-only migration.

On 2026-10-08 the live Data API returned `PGRST205` for `public.payment_methods` (table not found in the schema cache). The migration therefore needs applying, or the hosted schema cache needs reloading if it was applied outside this workspace. Hosted writes have not been verified; browser checks use simulated database responses.

For the existing dummy login, enable **Allow anonymous sign-ins** in Supabase Dashboard → Authentication → Sign In / Providers. The project's public auth settings reported this option disabled on 2026-10-08. No password or registration-page changes are needed. Saving the first valid card creates a real Supabase anonymous user and persists its session separately from the application's login client. Opening Payment without a saved session shows no cards and does not create a user.

Demo cards belong to this browser/device, rather than the email typed into the dummy login. Refreshing and logging into the dummy flow again reuse that payment session. Clearing browser/app storage or switching devices loses access to those demo cards. Registered users continue to use their own verified login identity; demo cards are not automatically transferred to registered accounts.

The form checks card brand, Luhn checksum, expiry, security-code length, name and save consent. Only `user_id`, brand, last four digits, expiry and cardholder name are sent to Supabase. The owner comes from the verified Supabase session, never a fabricated `demo_*` ID. Anonymous authenticated users use the existing owner-only row-level security policies; no public insert policy is needed. A successful database insert refreshes the saved cards on Payment; a failed insert stays on Add Card with an error.

If Save Card says anonymous sign-ins need enabling, turn on the setting above. If it says card storage is unavailable, run the SQL migration. Test with a test card such as `4111 1111 1111 1111`, a future expiry and a three-digit test security code. This client cannot apply dashboard settings or database migrations using its publishable API key.

Supabase references: [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) and [React Native session storage](https://supabase.com/docs/guides/auth/quickstarts/react-native).

This prototype saves masked display details. It does not create a chargeable provider token, verify ownership of a bank card or charge money. Full card numbers and CVV are never sent to the app backend or database. For real payments, replace local card inputs with the chosen provider's secure card SDK and save its verified token using a trusted backend.

Verify with `npm run lint`, `npm run typecheck` and `npm test`. Browser checks can exercise both successful inserts and database failures with test data. A mocked insert is not proof that the hosted database migration has been applied.

## Payment preview

Run `supabase_demo_payments.sql` once in the same project's Supabase SQL Editor to enable demo payment history. This adds an owner-only `demo_payments` table without changing the real `payments` table or its backend-only write permissions.

With a booking and a database-loaded saved card selected, Pay opens a white confirmation screen with a rotating green/grey ring. After 2.8 seconds it saves the demo receipt to Supabase, verifies the returned record and opens success only after that save succeeds. Failed or unavailable database writes show a retry screen. The same `(user_id, reference)` can only be saved once, including when a response is lost after committing. Direct success access requires the confirmed database record ID. Leaving the loading route cancels its animation/timer; a write already sent to the database may still complete, and will appear in history.

Payment History loads the owner's real payments and saved demo confirmations together on every visit. Demo entries have a purple label, a transaction reference, and a dedicated Demo filter; they do not appear under Paid. Search also matches the reference, subject and last four digits. Only verified Supabase identities can insert/read their own demo records; fabricated UI user IDs are never used as database owners.

This is explicitly labelled as a demo throughout the flow. It charges no money, creates no booking, and writes no `Paid` transaction to payment history. The `DEMO-` reference identifies a saved prototype confirmation, not a gateway transaction. A real integration must use a trusted backend's confirmed payment result to create real payment records.

Share opens the device share dialog; browsers without Web Share copy the receipt text. Download PDF opens a receipt-only print window on web (choose Save as PDF); Android/iOS generate a PDF and open the save/share dialog. Exported receipts also state that they are demos. Done clears the checkout/receipt and opens Payment History with the saved confirmation.
