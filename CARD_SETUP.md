# Add Card setup

The flow is **Booking Summary → Pay → Payment → Add New Card → Save Card → Payment**.

Use the existing project configured in `src/utils/supabase.js` and its two existing tables: `payment_methods` for saved cards and `demo_payments` for demo payment history. `supabase_payment_methods.sql` is the card setup/update file; `supabase_demo_payments.sql` is the original payment-history setup file.

On 2026-10-08, authenticated live reads verified both tables and their expected columns, with existing data returned from each. Edit and Delete probes against a nonexistent card returned HTTP 403 / PostgreSQL 42501: permission denied for table payment_methods. No existing card or history row was changed by these checks. For this installation, rerun the updated `supabase_payment_methods.sql` in the same project's SQL Editor to apply owner-only edit/remove permissions. The existing card and history tables stay in use. Hosted permission changes cannot be applied from this workspace with its public key; browser mutation checks use simulated responses.

For the existing dummy login, enable **Allow anonymous sign-ins** in Supabase Dashboard → Authentication → Sign In / Providers. The project's public auth settings reported this option disabled on 2026-10-08. No password or registration-page changes are needed. Saving the first valid card creates a real Supabase anonymous user and persists its session separately from the application's login client. Opening Payment without a saved session shows no cards and does not create a user.

Demo cards belong to this browser/device, rather than the email typed into the dummy login. Refreshing and logging into the dummy flow again reuse that payment session. Clearing browser/app storage or switching devices loses access to those demo cards. Registered users continue to use their own verified login identity; demo cards are not automatically transferred to registered accounts.

The form checks card brand, Luhn checksum, expiry, security-code length, name and save consent. Only `user_id`, brand, last four digits, expiry and cardholder name are sent to Supabase. The owner comes from the verified Supabase session, never a fabricated `demo_*` ID. Anonymous authenticated users use the existing owner-only row-level security policies; no public insert policy is needed. A successful database insert refreshes the saved cards on Payment; a failed insert stays on Add Card with an error.

If Save Card says anonymous sign-ins need enabling, turn on the setting above. If it says card storage is unavailable, run the SQL migration. Test with a test card such as `4111 1111 1111 1111`, a future expiry and a three-digit test security code. This client cannot apply dashboard settings or database migrations using its publishable API key.

Supabase references: [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) and [React Native session storage](https://supabase.com/docs/guides/auth/quickstarts/react-native).

This prototype saves masked display details. It does not create a chargeable provider token, verify ownership of a bank card or charge money. Full card numbers and CVV are never sent to the app backend or database. For real payments, replace local card inputs with the chosen provider's secure card SDK and save its verified token using a trusted backend.

Verify with `npm run lint`, `npm run typecheck` and `npm test`. Browser checks can exercise both successful inserts and database failures with test data. A mocked insert is not proof that the hosted database migration has been applied.

## Payment preview

`supabase_demo_payments.sql` remains the original setup for payment history in `demo_payments`. The existing installation already has this table and its data; card management requires updating `payment_methods` permissions through `supabase_payment_methods.sql`.

With a booking and a database-loaded saved card selected, Pay opens a white confirmation screen with a rotating green/grey ring. After 2.8 seconds it saves the demo receipt to Supabase, verifies the returned record and opens success only after that save succeeds. Failed or unavailable database writes show a retry screen. The same `(user_id, reference)` can only be saved once, including when a response is lost after committing. Direct success access requires the confirmed database record ID. Leaving the loading route cancels its animation/timer; a write already sent to the database may still complete, and will appear in history.

Payment History loads the owner's real payments and saved demo confirmations together on every visit. Demo entries have a purple label, a transaction reference, and a dedicated Demo filter; they do not appear under Paid. Search also matches the reference, subject and last four digits. Only verified Supabase identities can insert/read their own demo records; fabricated UI user IDs are never used as database owners.

This is explicitly labelled as a demo throughout the flow. It charges no money, creates no booking, and writes no `Paid` transaction to payment history. The `DEMO-` reference identifies a saved prototype confirmation, not a gateway transaction. A real integration must use a trusted backend's confirmed payment result to create real payment records.

Share opens the device share dialog; browsers without Web Share copy the receipt text. Download PDF opens a receipt-only print window on web (choose Save as PDF); Android/iOS generate a PDF and open the save/share dialog. Exported receipts also state that they are demos. Done clears the checkout/receipt and opens Payment History with the saved confirmation.

Payment History's top-right settings button opens a bottom sheet that slides up, displaying saved cards from the existing `payment_methods` table with Manage Payments and Add New Card buttons. It handles empty results, loading and failed reads, with retry. Edit/Delete actions appear only in Manage Payments. Adding or editing a card returns to the originating screen and refreshes the card list after the confirmed database write.

## Editing and removing saved cards

Card management uses the existing Supabase project and `public.payment_methods` table. Its existing `supabase_payment_methods.sql` file includes owner-only UPDATE/DELETE policies and column permissions. Rerun that file in the existing project's SQL Editor to apply these permissions. Its CREATE TABLE IF NOT EXISTS reuses the existing table and preserves saved card rows. Payment history stays in `demo_payments` with its original SQL setup. The app's public API key cannot apply database permission changes.

Edit loads the selected card under its verified owner and allows changes to cardholder name and expiry. The number, brand and owner remain immutable; add a new card for a different number. Only name and expiry columns receive update grants. Delete asks for confirmation and removes only the selected owner's saved card. Both actions verify the database response before refreshing lists, and permission errors stay visible for retry. Removing a saved card preserves historical payment receipts, which contain their own masked method snapshot.

Checks cover owner verification, rejected writes, confirmed responses, and masked update fields. Browser tests mock database writes to exercise Edit/Delete in Manage Payments, verify that the bottom sheet only displays cards, and check failures and small screens. These checks do not verify that the hosted permissions have been updated.
