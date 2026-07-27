# Projection methodology and data quality

Projected values are stored separately from provider-reported food nutrients. A projection can only fill a nutrient that lacks an authoritative value for the same food version. It never overwrites measured, provider-reported, calculated, confirmed-zero, or user-entered data.

Every projection stores its food and food version, nutrient, value and unit, lower and upper bounds, confidence score and category, method and method version, explanation, reference count, similarity, status, timestamps, reviewer, and invalidation information. References preserve source foods, versions, values, weights, similarity, priority, citations, and notes.

Initial confidence categories are high at 0.85+, moderate at 0.65–0.8499, low at 0.40–0.6499, and experimental below 0.40. Categories are enforced from numeric scores. Approved projections must meet both the owner-configured inclusion threshold and the method-version minimum. Low values are excluded by default. Experimental values remain excluded unless the owner explicitly enables them.

Candidate eligibility rejects unknown serving weights, incomplete sources, missing references, insufficient similarity, highly variable nutrients, and bioactives without matching species and preparation. These checks are conservative gates, not automatic scientific validation. This phase provides reviewable infrastructure and demo projections; production algorithms require validated reference sets and nutrition-data review.

When a food is logged, eligible projections are copied into immutable diary snapshots with projection ID, method, confidence, and scaled range. Historical snapshots are not rewritten when a projection is later invalidated. Editing an entry recalculates from the originally logged food version and currently eligible projection set; duplication preserves the exact snapshot lineage.

Users can switch between eligible-projection totals and confirmed/calculated-only totals. Admin reviewers must provide a reason to approve, reject, invalidate, or request recalculation. These actions are audited.
