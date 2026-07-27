begin;
insert into public.foods(id,name,brand,description,food_type,is_public,is_verified) values
('50000000-0000-0000-0000-000000000023','Protein powder, plant-based, generic',null,'Generic plant protein powder estimate','generic',true,true),
('50000000-0000-0000-0000-000000000024','Fish oil, high-strength omega-3, generic',null,'Generic concentrated fish oil estimate','generic',true,true),
('50000000-0000-0000-0000-000000000025','Vitamin D3 supplement, generic',null,'Generic vitamin D3 tablet estimate','generic',true,true),
('50000000-0000-0000-0000-000000000026','Magnesium supplement, generic',null,'Generic magnesium supplement estimate','generic',true,true),
('50000000-0000-0000-0000-000000000027','Vitamin B12 supplement, generic',null,'Generic vitamin B12 tablet estimate','generic',true,true),
('50000000-0000-0000-0000-000000000028','Creatine monohydrate, generic',null,'Generic creatine powder; creatine is not yet a tracked nutrient','generic',true,true),
('50000000-0000-0000-0000-000000000029','Collagen peptides, generic',null,'Generic collagen peptide powder estimate','generic',true,true),
('50000000-0000-0000-0000-000000000030','Calcium supplement, generic',null,'Generic calcium tablet estimate','generic',true,true),
('50000000-0000-0000-0000-000000000031','Iron supplement, generic',null,'Generic iron tablet estimate; compare dosage with product label','generic',true,true),
('50000000-0000-0000-0000-000000000032','Zinc supplement, generic',null,'Generic zinc tablet estimate','generic',true,true)
on conflict(id) do nothing;
insert into public.food_versions(id,food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload)
select ('60000000-0000-0000-0000-'||right(f.id::text,12))::uuid,f.id,1,'10000000-0000-0000-0000-000000000001','supplement-'||replace(lower(split_part(f.name,',',1)),' ','-'),70,true,jsonb_build_object('notice','Generic supplement estimate; compare with product label') from public.foods f where f.id between '50000000-0000-0000-0000-000000000023' and '50000000-0000-0000-0000-000000000032' on conflict(id) do nothing;
update public.foods f set current_version_id=v.id from public.food_versions v where v.food_id=f.id and f.id between '50000000-0000-0000-0000-000000000023' and '50000000-0000-0000-0000-000000000032';
insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,is_default)
select v.id,case f.id when '50000000-0000-0000-0000-000000000023' then '1 scoop (30 g)' when '50000000-0000-0000-0000-000000000028' then '1 scoop (5 g)' when '50000000-0000-0000-0000-000000000029' then '1 scoop (20 g)' when '50000000-0000-0000-0000-000000000024' then '1 softgel (1 g)' else '1 tablet' end,1,case when f.id in('50000000-0000-0000-0000-000000000023','50000000-0000-0000-0000-000000000028','50000000-0000-0000-0000-000000000029') then 'scoop' when f.id='50000000-0000-0000-0000-000000000024' then 'softgel' else 'tablet' end,case f.id when '50000000-0000-0000-0000-000000000023' then 30 when '50000000-0000-0000-0000-000000000028' then 5 when '50000000-0000-0000-0000-000000000029' then 20 else 1 end,true
from public.foods f join public.food_versions v on v.food_id=f.id where f.id between '50000000-0000-0000-0000-000000000023' and '50000000-0000-0000-0000-000000000032' on conflict do nothing;
with supplement_values(food_id,key,serving_amount) as(values
('50000000-0000-0000-0000-000000000023'::uuid,'energy_kcal',120::numeric),('50000000-0000-0000-0000-000000000023','protein',22),('50000000-0000-0000-0000-000000000023','carbohydrate',4),('50000000-0000-0000-0000-000000000023','fat',2),('50000000-0000-0000-0000-000000000023','iron',5),
('50000000-0000-0000-0000-000000000024','energy_kcal',9),('50000000-0000-0000-0000-000000000024','fat',1),('50000000-0000-0000-0000-000000000024','omega_3',600),
('50000000-0000-0000-0000-000000000025','vitamin_d',25),('50000000-0000-0000-0000-000000000026','magnesium',200),('50000000-0000-0000-0000-000000000027','vitamin_b12',100),
('50000000-0000-0000-0000-000000000029','energy_kcal',72),('50000000-0000-0000-0000-000000000029','protein',18),('50000000-0000-0000-0000-000000000030','calcium',500),('50000000-0000-0000-0000-000000000031','iron',18),('50000000-0000-0000-0000-000000000032','zinc',15)
),servings as(select f.id food_id,f.current_version_id,s.gram_weight from public.foods f join public.food_servings s on s.food_version_id=f.current_version_id where f.id between '50000000-0000-0000-0000-000000000023' and '50000000-0000-0000-0000-000000000032')
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select s.current_version_id,n.id,round(v.serving_amount/s.gram_weight*100,6),n.default_unit_id,'inferred','Generic per-serving supplement estimate; compare with product label' from supplement_values v join servings s on s.food_id=v.food_id join public.nutrients n on n.key=v.key on conflict(food_version_id,nutrient_id) do nothing;
insert into public.food_popularity(food_id,total_selections,unique_users,recent_selections,score) select id,300,75,30,80 from public.foods where id between '50000000-0000-0000-0000-000000000023' and '50000000-0000-0000-0000-000000000032' on conflict(food_id) do nothing;
commit;
