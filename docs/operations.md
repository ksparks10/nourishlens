# Operations and deployment readiness

Deploy only after all commands below pass against a production-like environment:

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
supabase test db
```

Configure encrypted environment variables from `.env.example`; keep service-role and Stripe secrets server-only. Apply migrations before shifting traffic. Verify `/api/health`, authentication email delivery, account export/deletion, owner access, webhook signatures, rate limits, alerts, backup status, and legal pages.

Monitor health failures, provider error rates, failed Stripe events, automation failures, database capacity, latency, and high error rates. Feature flags should be used for controlled rollout, not as authorization. During incidents, disable affected features, preserve evidence without private nutrition payloads, communicate through owner-approved channels, and record resolution in system incidents.

This repository intentionally contains no automatic production deployment or paid-resource provisioning. The owner remains responsible for vendor selection, costs, domains, production credentials, and launch approval.
