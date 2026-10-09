# Shared tutor feedback

Run [supabase_feedback.sql](./supabase_feedback.sql) in the SQL Editor of the same Supabase project configured in `src/utils/supabase.js`. This workspace has a public API key and cannot apply database migrations. The setup adds `tutor_ratings`, `tutor_comments`, and `tutor_comment_reactions` while preserving existing tutors and payments.

Screens live in `src/screens/`, reusable feedback views and the drawer in `src/components/`, Supabase operations in `src/services/feedback.js`, rating calculations in `src/data/feedback.js`, and the feedback hook in `src/hooks/useTutorFeedback.js`. SQL setup and documentation live beside the project's other Supabase setup files at the project root.

Normal signed-in accounts use their verified Supabase user ID. For the app's demo login, enable **Authentication → Sign In / Providers → Anonymous Sign-Ins** if it is not already enabled. Feedback reuses the app's existing anonymous demo identity; it creates that identity only when someone submits a rating, comment, or reaction. Shared feedback remains publicly readable.

Open **Payments → star → testingfeedback**, then tap a tutor. The drawer shows that tutor's rating average, rating distribution, and latest comment. Tapping **Add a comment...** opens the drawer's **Your feedback** form. Someone who has not rated this tutor must first select a star rating; the optional comment composer becomes available after the rating is saved. Existing ratings are shown automatically, allowing returning users to add a comment immediately or update their rating. **Done** returns to the summary without requiring a comment. Sending a comment also returns to the summary. **View all** opens **Feedback & Comments** with comment threads, replies, and like/dislike controls. Feedback is fetched again when the drawer opens or the full page's refresh button is pressed.

Every read filters by `tutor_id`. Ratings allow one entry per authenticated user per tutor, with subsequent selections updating that entry. Replies and reactions have composite foreign keys that prevent attaching them to another tutor's comments. RLS allows people to write ratings, comments, and reactions under their own Supabase user ID. Example names, comments, and review totals from the design references are not seeded into the database.

On **Feedback & Comments**, the three-dot menu appears on the current user's own comments and replies. **Edit** prefills the composer; the check button saves changes and the cancel control leaves the stored text intact. **Delete** opens a confirmation dialog. Deleting a parent comment also removes its replies and reactions; the confirmation explicitly explains this.

If feedback was already installed, rerun the updated [supabase_feedback.sql](./supabase_feedback.sql) to grant owner-only comment edit/delete permissions. Existing rows are preserved. Updates grant access only to the `body` column, so the author and tutor cannot be reassigned. The public key in this workspace cannot apply these hosted permission changes.

If the tables have not been created, the app displays an unavailable message and Retry. Failed writes retain the draft and show an error; successful writes are confirmed by Supabase before the composer clears.

Validation: Expo lint, TypeScript checking, web bundling, and isolated simulated Supabase checks. The migration and live database writes still require validation in the configured Supabase project.

Run comment mutation regression checks with `node --test tests/feedback-comments.test.js`.
