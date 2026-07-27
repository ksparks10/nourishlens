begin;

with core as (
  select count(*)::numeric total from public.nutrients where is_core
), coverage as (
  select v.id,
    coalesce(round(count(distinct fvn.nutrient_id) filter(where fvn.amount_per_100g is not null)*100.0/nullif(core.total,0)),0)::integer value
  from public.food_versions v cross join core
  left join public.food_version_nutrients fvn on fvn.food_version_id=v.id
  group by v.id,core.total
)
update public.food_versions v set data_completeness=c.value
from coverage c where c.id=v.id and v.data_completeness is distinct from c.value;

commit;
