begin;
insert into public.foods(id,name,brand,description,food_type,is_public,is_verified) values
('50000000-0000-0000-0000-000000000011','Potato, cooked, with skin',null,'Generic cooked potato for quick logging','generic',true,true),
('50000000-0000-0000-0000-000000000012','Potato, baked, with skin',null,'Specific baked potato preparation','generic',true,true),
('50000000-0000-0000-0000-000000000013','Potato, boiled, without skin',null,'Specific boiled potato preparation','generic',true,true),
('50000000-0000-0000-0000-000000000014','Potatoes, mashed, prepared',null,'Specific mashed potato preparation','generic',true,true)
on conflict(id) do nothing;
insert into public.food_versions(id,food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload) values
('60000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000011',1,'10000000-0000-0000-0000-000000000001','demo-potato-cooked-skin',100,false,'{"notice":"Local demo reference; replace with reviewed provider data before production"}'),
('60000000-0000-0000-0000-000000000012','50000000-0000-0000-0000-000000000012',1,'10000000-0000-0000-0000-000000000001','demo-potato-baked-skin',95,false,'{"notice":"Local demo preparation reference"}'),
('60000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000013',1,'10000000-0000-0000-0000-000000000001','demo-potato-boiled-no-skin',90,false,'{"notice":"Local demo preparation reference"}'),
('60000000-0000-0000-0000-000000000014','50000000-0000-0000-0000-000000000014',1,'10000000-0000-0000-0000-000000000001','demo-potatoes-mashed',80,true,'{"notice":"Preparation estimate; milk, butter, and salt vary"}')
on conflict(id) do nothing;
update public.foods f set current_version_id=v.id from public.food_versions v where v.food_id=f.id and f.id in('50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012','50000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000014');
insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,is_default) values
('60000000-0000-0000-0000-000000000011','1 medium potato',1,'potato',173,true),
('60000000-0000-0000-0000-000000000012','1 medium baked potato',1,'potato',173,true),
('60000000-0000-0000-0000-000000000013','1 medium boiled potato',1,'potato',167,true),
('60000000-0000-0000-0000-000000000014','1 cup mashed potatoes',1,'cup',210,true)
on conflict do nothing;

with potato_values(key,amount) as (values
('energy_kcal',93::numeric),('protein',2.5),('carbohydrate',21.2),('fat',0.13),('fiber',2.2),('sodium',10),
('vitamin_a',0),('vitamin_c',9.6),('vitamin_d',0),('vitamin_e',0.04),('vitamin_k',2),('thiamin',0.105),('riboflavin',0.021),('niacin',1.4),('pantothenic_acid',0.376),('vitamin_b6',0.311),('biotin',0.4),('folate',28),('vitamin_b12',0),('choline',13.5),
('iron',1.08),('calcium',15),('potassium',535),('magnesium',28),('zinc',0.36),('phosphorus',70),('selenium',0.4),('copper',0.118),('manganese',0.219)
)
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select '60000000-0000-0000-0000-000000000011',n.id,p.amount,n.default_unit_id,'provider_reported','Demo cooked potato reference per 100 g; replace with reviewed provider data before production'
from potato_values p join public.nutrients n on n.key=p.key on conflict(food_version_id,nutrient_id) do nothing;

insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select v.id,base.nutrient_id,
 case
  when v.food_id='50000000-0000-0000-0000-000000000012' and n.key='energy_kcal' then 93
  when v.food_id='50000000-0000-0000-0000-000000000012' and n.key='potassium' then 535
  when v.food_id='50000000-0000-0000-0000-000000000013' and n.key='energy_kcal' then 87
  when v.food_id='50000000-0000-0000-0000-000000000013' and n.key='potassium' then 379
  when v.food_id='50000000-0000-0000-0000-000000000014' and n.key='energy_kcal' then 113
  when v.food_id='50000000-0000-0000-0000-000000000014' and n.key='fat' then 4.2
  when v.food_id='50000000-0000-0000-0000-000000000014' and n.key='sodium' then 333
  else base.amount_per_100g end,
 base.unit_id,case when v.food_id='50000000-0000-0000-0000-000000000014' then 'inferred' else 'calculated' end,
 case when v.food_id='50000000-0000-0000-0000-000000000014' then 'Preparation estimate; user review encouraged because added ingredients vary' else 'Derived from generic cooked potato demo reference' end
from public.food_versions v cross join public.food_version_nutrients base join public.nutrients n on n.id=base.nutrient_id
where base.food_version_id='60000000-0000-0000-0000-000000000011' and v.id in('60000000-0000-0000-0000-000000000012','60000000-0000-0000-0000-000000000013','60000000-0000-0000-0000-000000000014')
on conflict(food_version_id,nutrient_id) do nothing;
insert into public.food_popularity(food_id,total_selections,unique_users,recent_selections,score) values
('50000000-0000-0000-0000-000000000011',1000,250,100,100),('50000000-0000-0000-0000-000000000012',800,210,80,90),('50000000-0000-0000-0000-000000000013',650,170,65,82),('50000000-0000-0000-0000-000000000014',750,195,75,86)
on conflict(food_id) do nothing;

create or replace function public.search_food_catalog(search_query text,result_limit integer default 20,result_offset integer default 0)
returns table(id uuid,name text,brand text,food_type text,is_verified boolean,data_completeness smallint,contains_projections boolean,source_key text,serving_label text,serving_grams numeric,calories numeric)
language sql stable security invoker set search_path='' as $$
 with query_input as(select replace(replace(replace(replace(lower(trim(search_query)),'mac and cheese','macaroni & cheese'),'mac & cheese','macaroni & cheese'),'eggs','egg'),'potatoes','potato') as normalized)
 select f.id,f.name,f.brand,f.food_type,f.is_verified,v.data_completeness,v.contains_projections,s.key,sv.label,sv.gram_weight,cal.amount_per_100g*(sv.gram_weight/100)
 from public.foods f join public.food_versions v on v.id=f.current_version_id left join public.food_sources s on s.id=v.source_id left join public.food_servings sv on sv.food_version_id=v.id and sv.is_default left join public.food_version_nutrients cal on cal.food_version_id=v.id and cal.nutrient_id=(select id from public.nutrients where key='energy_kcal') left join public.food_popularity pop on pop.food_id=f.id cross join query_input q
 where f.deleted_at is null and(f.is_public or f.owner_id=auth.uid()) and(q.normalized='' or f.search_text operator(public.%) q.normalized or f.search_text like '%'||q.normalized||'%' or f.name ilike '%'||replace(q.normalized,'macaroni','mac')||'%')
 order by(f.search_text=q.normalized) desc,(f.food_type='generic' and f.brand is null) desc,public.similarity(f.search_text,q.normalized) desc,f.is_verified desc,v.data_completeness desc,coalesce(pop.score,0) desc
 limit least(greatest(result_limit,1),50) offset greatest(result_offset,0);
$$;
grant execute on function public.search_food_catalog(text,integer,integer) to authenticated;
commit;
