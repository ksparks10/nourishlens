# Diary, snapshots, aggregation, and targets

Phase 3 stores diary data by user, date, meal, and entry. Logging is an atomic database operation. It validates catalog access, records the exact food version and gram weight, then copies every nutrient into a snapshot. Each snapshot preserves source amount, source classification, scaled amount, unit, food version, calculation basis, and timestamp. Browser clients can read but never insert or update snapshot rows.

Daily aggregation is centralized in PostgreSQL and returns confirmed, calculated, projected, user-entered, excluding-projection, and including-projection totals. Missing values remain missing and contribute to missing counts. Phase 3 does not generate projections, so projection dependency remains zero until Phase 4.

The initial target engine uses age, height, weight, biological sex input where relevant, activity, goal, and user overrides. Energy uses a versioned Mifflin-St Jeor-derived planning estimate with activity and goal adjustment. Macro targets are application-derived and versioned. Fiber and sodium use general Daily Value references. These are planning tools, not medical advice. Pregnancy and lactation-specific targets, complete DRI demographic tables, and clinical customization require later reviewed reference-data work.
