# Nourish Lens

A privacy-first nutrition tracker built with Next.js, TypeScript, Supabase, and PostgreSQL. Phase 1 covers identity and secure administration. Phase 2 adds a versioned food and nutrient catalog, server-only provider adapters, reviewed demo data, search, barcode lookup, product details, and serving previews.
Phase 3 adds onboarding, versioned personalized targets, meal logging, immutable nutrient snapshots, daily aggregation, diary management, dashboard progress, and nutrient drill-down.
Phase 4 adds projection methods, confidence and eligibility rules, provenance, immutable projection lineage, confirmed-only views, projection reports, configurable thresholds, and an audited admin review queue.
Phase 5 adds disabled-by-default Stripe integration, authoritative idempotent webhooks, subscriptions, complimentary grants, hashed promo codes, `FREEFORME`, billing UI, and server-side premium access checks.
Phase 6 adds versioned recipes, ingredient projection lineage, saved meals, favorites, historical reports, provenance-rich CSV exports, and weight tracking.
Phase 7 adds granular administration for users, private-data access auditing, food moderation, nutrient mappings, projection recalculation, analytics, content, flags, automations, audit logs, and system health.
Phase 8 adds production security headers, shared rate limiting, health monitoring, public legal surfaces, accessibility hardening, local Playwright coverage, retention controls, and deployment/recovery procedures.

## Local setup

1. Install Node.js 20+, Docker, and the Supabase CLI.
2. Copy `.env.example` to `.env.local` and provide the local or hosted Supabase values.
3. Run `npm install`, then `supabase start` and `supabase db reset`.
4. Run `npm run dev` and open `http://localhost:3000`.

Create the first account through `/signup`. Find its UUID in Supabase Auth, then bootstrap the only initial owner from the SQL editor using a privileged database session:

```sql
select public.bootstrap_owner('USER_UUID');
```

The function is unavailable to browser roles, refuses a second owner, and the owner role cannot be updated or deleted. A future explicit ownership-transfer workflow must be used to change ownership.

## Verification

```sh
npm run lint
npm run typecheck
npm test
supabase test db
npm run build
```

See [architecture](docs/architecture.md), [Supabase setup](docs/supabase.md), [testing](docs/testing.md), and [deployment](docs/deployment.md).
Provider configuration and data behavior are documented in [food providers](docs/food-providers.md).
Diary history and target calculations are documented in [diary and targets](docs/diary-and-targets.md).
Projection behavior is documented in [projection methodology](docs/projection-methodology.md).
Billing setup and access semantics are documented in [billing and access](docs/billing-and-access.md).
Recipes and historical analysis are documented in [recipes, reports, and exports](docs/recipes-reports-exports.md).
Administrative security and workflows are documented in [administration](docs/administration.md).
Production controls are documented in [security review](docs/security-review.md), [backup and recovery](docs/backup-recovery.md), and [operations](docs/operations.md).

This product is for education and tracking. It does not diagnose, treat, cure, or prevent medical conditions.
