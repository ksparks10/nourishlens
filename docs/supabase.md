# Supabase setup

Create a project or run the local Supabase stack. Apply migrations with `supabase db reset` locally or `supabase db push` to the linked project. Configure email/password authentication, email verification, redirect URLs, and optional Google OAuth in the Supabase dashboard. Add the site URL and `/auth/callback` to allowed redirects. Never expose the service-role key to the browser.

Run the owner bootstrap SQL described in the README from a privileged SQL session after the initial owner verifies their account.
