# Security and privacy review

The application uses Supabase Auth, server-side session validation, PostgreSQL RLS, granular permissions, reason-bound private-data access, immutable audit logs, server-only service credentials, signature-verified Stripe webhooks, idempotent event processing, validation, shared database rate limits, and no-store sensitive exports.

Production review must verify all deployed RLS policies, OAuth redirect allowlists, administrator MFA, secret rotation, CSP compatibility, TLS/HSTS, Supabase network restrictions, Stripe test-mode events, dependency alerts, log redaction, data retention, deletion/export procedures, and jurisdiction-specific legal documents. Never place nutrition details in analytics properties, URLs, operational events, or third-party error metadata.

The health endpoint reports only reachability and timing. It exposes no credentials or internal errors. Operational cleanup requires a system-health permission. Local services use shared development secrets and must never be internet-exposed.

## Launch blockers requiring the owner

- Replace privacy-policy and terms placeholders with reviewed documents.
- Configure a monitored support contact.
- Select and configure production Supabase, domain, email, OAuth, and backups.
- Bootstrap the production owner and enable MFA.
- Personally configure Stripe test mode and later decide whether to enable live billing.
- Review vendor terms, costs, and data-processing agreements.
