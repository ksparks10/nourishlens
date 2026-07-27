# Architecture

Next.js App Router provides public, authenticated `/app`, and permission-protected `/admin` surfaces. Supabase Auth is the identity authority. Server Components validate users with `getUser`; the admin layout additionally calls the database-backed `has_permission` function. Hiding navigation is never treated as authorization.

PostgreSQL owns role/permission resolution and RLS. New accounts receive a profile and free-user role through an auth trigger. Direct user overrides take precedence over role grants. Audit rows have no browser write policy. Service credentials are server-only and optional during ordinary application rendering.

Owner bootstrapping is a one-time, privileged database operation. It is not based on an email or client-visible setting. Owner-role mutation is blocked pending an explicit ownership-transfer workflow.

Staff invitations use a random single-use token; only its SHA-256 digest is stored. Acceptance requires an authenticated account with the exact invited email. Ownership transfer is atomic, owner-only, reason-required, and audited. Account exports are generated server-side with no-store caching. Deletion uses the service-role client only after explicit confirmation.
