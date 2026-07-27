begin;

with fat_limits as (
  select
    t.id,
    n.key,
    case
      when n.key = 'saturated_fat' then round(coalesce(energy.target_amount, 2000) * 0.10 / 9, 1)
      when n.key = 'trans_fat' then round(coalesce(energy.target_amount, 2000) * 0.01 / 9, 1)
    end as maximum_amount
  from public.user_nutrient_targets t
  join public.nutrients n on n.id = t.nutrient_id
  left join public.nutrients energy_n on energy_n.key = 'energy_kcal'
  left join public.user_nutrient_targets energy
    on energy.user_id = t.user_id and energy.nutrient_id = energy_n.id
  where n.key in ('saturated_fat', 'trans_fat') and not t.is_overridden
)
update public.user_nutrient_targets t
set
  target_amount = limits.maximum_amount,
  minimum_amount = case when limits.key = 'saturated_fat' then 1 else null end,
  maximum_amount = limits.maximum_amount,
  target_type = case when limits.key = 'saturated_fat' then 'range' else 'maximum' end,
  calculation_version = 'targets-v4',
  effective_at = now()
from fat_limits limits
where t.id = limits.id;

commit;
