begin;
insert into public.foods(id,name,brand,description,food_type,is_public,is_verified) values
('50000000-0000-0000-0000-000000000008','Egg, whole, hard-boiled',null,'Specific hard-boiled egg preparation','generic',true,true),
('50000000-0000-0000-0000-000000000009','Egg, whole, fried',null,'Specific fried egg preparation','generic',true,true),
('50000000-0000-0000-0000-000000000010','Eggs, scrambled',null,'Specific scrambled egg preparation','generic',true,true)
on conflict(id) do nothing;
insert into public.food_versions(id,food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload) values
('60000000-0000-0000-0000-000000000008','50000000-0000-0000-0000-000000000008',1,'10000000-0000-0000-0000-000000000001','demo-egg-hard-boiled',100,false,'{"notice":"Demo preparation derived from local generic egg reference"}'),
('60000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000009',1,'10000000-0000-0000-0000-000000000001','demo-egg-fried',85,true,'{"notice":"Demo preparation estimate; cooking fat varies"}'),
('60000000-0000-0000-0000-000000000010','50000000-0000-0000-0000-000000000010',1,'10000000-0000-0000-0000-000000000001','demo-eggs-scrambled',80,true,'{"notice":"Demo preparation estimate; recipe ingredients vary"}')
on conflict(id) do nothing;
update public.foods f set current_version_id=v.id from public.food_versions v where v.food_id=f.id and f.id in('50000000-0000-0000-0000-000000000008','50000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000010');
insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,is_default) values
('60000000-0000-0000-0000-000000000008','1 large hard-boiled egg',1,'egg',50,true),
('60000000-0000-0000-0000-000000000009','1 large fried egg',1,'egg',46,true),
('60000000-0000-0000-0000-000000000010','2 large scrambled eggs',2,'eggs',100,true)
on conflict do nothing;
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select v.id,base.nutrient_id,
 case when v.food_id='50000000-0000-0000-0000-000000000009' and n.key='energy_kcal' then 196 when v.food_id='50000000-0000-0000-0000-000000000009' and n.key='fat' then 14.8 when v.food_id='50000000-0000-0000-0000-000000000009' and n.key='sodium' then 207 when v.food_id='50000000-0000-0000-0000-000000000010' and n.key='energy_kcal' then 166 when v.food_id='50000000-0000-0000-0000-000000000010' and n.key='fat' then 12 when v.food_id='50000000-0000-0000-0000-000000000010' and n.key='sodium' then 280 else base.amount_per_100g end,
 base.unit_id,case when v.food_id='50000000-0000-0000-0000-000000000008' then 'calculated' else 'inferred' end,
 case when v.food_id='50000000-0000-0000-0000-000000000008' then 'Derived from generic cooked egg demo reference' else 'Preparation estimate; user review encouraged because added ingredients vary' end
from public.food_versions v cross join public.food_version_nutrients base join public.nutrients n on n.id=base.nutrient_id
where base.food_version_id='60000000-0000-0000-0000-000000000007' and v.id in('60000000-0000-0000-0000-000000000008','60000000-0000-0000-0000-000000000009','60000000-0000-0000-0000-000000000010')
on conflict(food_version_id,nutrient_id) do nothing;
insert into public.food_popularity(food_id,total_selections,unique_users,recent_selections,score) values
('50000000-0000-0000-0000-000000000008',700,180,70,80),('50000000-0000-0000-0000-000000000009',600,150,60,75),('50000000-0000-0000-0000-000000000010',650,160,65,78)
on conflict(food_id) do nothing;
commit;
