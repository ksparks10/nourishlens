begin;
grant usage on schema public to authenticated;

grant select on public.profiles,public.roles,public.permissions,public.role_permissions,public.user_roles,public.user_permissions,public.staff_invitations,public.audit_logs,public.account_deletion_requests to authenticated;
grant update on public.profiles to authenticated;
grant insert,update,delete on public.user_roles,public.user_permissions,public.staff_invitations to authenticated;
grant insert on public.account_deletion_requests to authenticated;

grant select on public.food_sources,public.foods,public.food_versions,public.food_servings,public.nutrient_categories,public.nutrient_units,public.nutrients,public.food_version_nutrients,public.food_barcodes,public.food_images,public.food_popularity,public.provider_api_logs,public.provider_food_cache to authenticated;
grant insert,update,delete on public.foods to authenticated;

grant select on public.nutrition_profiles,public.target_methodologies,public.user_nutrient_targets,public.meal_types,public.diary_days,public.meals,public.meal_entries,public.meal_entry_nutrient_snapshots to authenticated;
grant insert,update,delete on public.nutrition_profiles,public.user_nutrient_targets,public.diary_days,public.meals,public.meal_entries to authenticated;

grant select on public.projection_settings,public.projection_methods,public.projection_method_versions,public.nutrient_projections,public.nutrient_projection_references,public.projection_reviews,public.projection_recalculations to authenticated;
grant insert,update,delete on public.nutrient_projections,public.nutrient_projection_references,public.projection_reviews,public.projection_recalculations to authenticated;
grant update on public.projection_settings to authenticated;

grant select on public.subscription_plans,public.stripe_customers,public.subscriptions,public.stripe_events,public.promo_codes,public.promo_code_redemptions,public.access_grants to authenticated;
grant insert,update,delete on public.promo_codes,public.access_grants to authenticated;

grant select on public.favorite_foods,public.weight_logs,public.recipes,public.recipe_versions,public.recipe_ingredients,public.recipe_ingredient_nutrient_snapshots,public.recipe_nutrient_snapshots,public.saved_meals,public.saved_meal_items to authenticated;
grant insert,update,delete on public.favorite_foods,public.weight_logs,public.recipes,public.recipe_versions,public.recipe_ingredients,public.saved_meals,public.saved_meal_items to authenticated;

grant select on public.admin_user_notes,public.admin_access_logs,public.food_reports,public.custom_food_submissions,public.provider_nutrient_mappings,public.daily_analytics_rollups,public.content_blocks,public.feature_flags,public.automation_definitions,public.automation_runs,public.system_incidents,public.app_settings,public.operational_events to authenticated;
grant insert,update,delete on public.admin_user_notes,public.food_reports,public.custom_food_submissions,public.provider_nutrient_mappings,public.content_blocks,public.feature_flags,public.automation_definitions,public.automation_runs,public.system_incidents,public.app_settings to authenticated;
grant insert on public.product_events to authenticated;
grant usage,select on sequence public.product_events_id_seq to authenticated;

-- No browser grants are provided for rate-limit buckets, operational-event writes,
-- Stripe state writes, audit writes, or immutable nutrient snapshot writes.
commit;
