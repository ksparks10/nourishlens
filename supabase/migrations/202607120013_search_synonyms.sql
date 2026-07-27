begin;
create or replace function public.search_food_catalog(search_query text,result_limit integer default 20,result_offset integer default 0)
returns table(id uuid,name text,brand text,food_type text,is_verified boolean,data_completeness smallint,contains_projections boolean,source_key text,serving_label text,serving_grams numeric,calories numeric)
language sql stable security invoker set search_path='' as $$
 with query_input as(select replace(replace(lower(trim(search_query)),'mac and cheese','macaroni & cheese'),'mac & cheese','macaroni & cheese') as normalized)
 select f.id,f.name,f.brand,f.food_type,f.is_verified,v.data_completeness,v.contains_projections,s.key,sv.label,sv.gram_weight,cal.amount_per_100g*(sv.gram_weight/100)
 from public.foods f join public.food_versions v on v.id=f.current_version_id left join public.food_sources s on s.id=v.source_id left join public.food_servings sv on sv.food_version_id=v.id and sv.is_default left join public.food_version_nutrients cal on cal.food_version_id=v.id and cal.nutrient_id=(select id from public.nutrients where key='energy_kcal') left join public.food_popularity pop on pop.food_id=f.id cross join query_input q
 where f.deleted_at is null and(f.is_public or f.owner_id=auth.uid()) and(q.normalized='' or f.search_text operator(public.%) q.normalized or f.search_text like '%'||q.normalized||'%' or f.name ilike '%'||replace(q.normalized,'macaroni','mac')||'%')
 order by(f.search_text=q.normalized) desc,public.similarity(f.search_text,q.normalized) desc,f.is_verified desc,v.data_completeness desc,coalesce(pop.score,0) desc
 limit least(greatest(result_limit,1),50) offset greatest(result_offset,0);
$$;
grant execute on function public.search_food_catalog(text,integer,integer) to authenticated;
commit;
