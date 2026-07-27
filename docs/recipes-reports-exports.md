# Recipes, saved meals, reports, exports, and weight

Recipes are private and versioned. Atomic creation captures each ingredient’s exact food version and gram weight. Ingredient nutrient snapshots preserve value classification, projection ID, method, confidence, bounds, and timestamp. Recipe totals retain confirmed/calculated and projected contributions separately, along with projected percentage and uncertainty range. Per-serving values divide versioned totals by the versioned serving count.

Saved meals are created from owned diary meals. Each item stores the exact food version and gram weight. Logging a saved meal uses those preserved versions and creates new diary snapshots; it does not silently switch to the catalog’s current version.

Historical reports support 7-, 30-, 90-day, and custom ranges. They show confirmed-only and projection-inclusive daily averages and projected share. CSV exports include date, meal, food, brand, serving, nutrient, value, unit, classification, separate confirmed and projected amounts, confidence, method, food version, and projection ID.

Weight logs are private, date-keyed, editable through upsert, and protected by RLS. Reports and exports are premium features; complimentary grants, including `FREEFORME`, satisfy the same server-side access check.
