begin;
create or replace function public.recommend_foods_for_nutrients(p_nutrient_keys text[],p_limit integer default 10)
returns table(food_id uuid,food_name text,brand text,serving_label text,serving_grams numeric,score numeric,nutrient_hits integer,contributions jsonb)
language sql stable security invoker set search_path='' as $$
 with requested as(select n.id,n.key,n.name,u.symbol,coalesce(t.target_amount,t.minimum_amount,t.maximum_amount,1) target_amount from public.nutrients n join public.nutrient_units u on u.id=n.default_unit_id left join public.user_nutrient_targets t on t.nutrient_id=n.id and t.user_id=auth.uid() where n.key=any(p_nutrient_keys)),
 candidates as(select f.id food_id,f.name food_name,f.brand,sv.label serving_label,sv.gram_weight serving_grams,r.key,r.name nutrient_name,r.symbol,v.amount_per_100g,r.target_amount,least(v.amount_per_100g/nullif(r.target_amount,0),2) density from public.foods f join public.food_versions fv on fv.id=f.current_version_id join public.food_version_nutrients v on v.food_version_id=fv.id join requested r on r.id=v.nutrient_id left join public.food_servings sv on sv.food_version_id=fv.id and sv.is_default where f.deleted_at is null and(f.is_public or f.owner_id=auth.uid()) and v.amount_per_100g is not null and v.amount_per_100g>0 and v.classification not in('not_reported','not_applicable') and coalesce(fv.provider_record_id,'') not like 'supplement-%' and lower(f.name) not like '%supplement%' and lower(f.name) not like '%protein powder%')
 select food_id,max(food_name),max(brand),max(serving_label),max(serving_grams),round(sum(density),6),count(distinct key)::integer,jsonb_agg(jsonb_build_object('key',key,'name',nutrient_name,'amountPer100g',amount_per_100g,'unit',symbol,'targetShare',round(density*100,1)) order by density desc)
 from candidates group by food_id order by sum(density) desc,count(distinct key) desc,max(food_name) limit least(greatest(p_limit,1),25);
$$;
revoke all on function public.recommend_foods_for_nutrients(text[],integer) from public,anon;grant execute on function public.recommend_foods_for_nutrients(text[],integer) to authenticated;
commit;
