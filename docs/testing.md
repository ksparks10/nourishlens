# Testing

Vitest covers auth validation, invitation validation, ownership-transfer input, and callback redirect safety. pgTAP verifies foundational schema, policies, relationships, invitation functions, and owner protection. Run `npm test` and `supabase test db`. Full auth integration requires a running local Supabase instance. Browser E2E coverage still requires a configured test-email strategy.

Phase 2 unit tests cover serving scaling, ounce conversion, missing-value preservation, invalid quantities, classification preservation, provider numeric validation, and completeness scoring. Database tests cover catalog tables, catalog RLS, version relationships, and the search function.

Phase 5 tests cover promo normalization, supported code syntax, subscription states and period expiry, permanent and time-limited grants, future grants, revocation, and expiration. Database assertions verify billing tables, browser read-only Stripe state, atomic promo redemption, and centralized access checks.
