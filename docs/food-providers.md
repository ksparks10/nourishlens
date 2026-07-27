# Food providers

The application uses one normalized interface for the internal Supabase catalog, USDA FoodData Central, the NIH Dietary Supplement Label Database, and Health Canada's Canadian Nutrient File. Open Food Facts support remains in code for historical imported records but is not used for active search because many labels omit micronutrients. Provider calls occur only on the server.

Internal search uses PostgreSQL trigram matching, exact-match preference, verification, completeness, and aggregate popularity. Food searches query USDA and Health Canada; supplement searches query NIH DSLD. Local USDA testing uses `DEMO_KEY` with its low public limit; the owner must obtain and enter a free private data.gov key before staging. NIH DSLD and Health Canada need no key for standard access. No paid service is activated.

External normalized records are cached for 24 hours when a working service-role key is configured. Imported records are private to the importing user, versioned, and retain provider IDs, units, and payload provenance. Normalized source values are `provider_reported`, explicit zero values are `confirmed_zero`, and absent or unmapped values remain absent.

The provider interface lives under `providers/nutrition` and supports search, ID lookup, barcode lookup, and health reporting. Add providers by implementing the interface without changing diary-facing types.
