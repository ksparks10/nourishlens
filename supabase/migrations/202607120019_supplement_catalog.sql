begin;
insert into public.nutrient_categories(id,key,name,sort_order) values('20000000-0000-0000-0000-000000000004','fatty_acids','Fatty acids',4) on conflict(key) do nothing;
insert into public.nutrients(id,key,name,category_id,default_unit_id,is_core) values('40000000-0000-0000-0000-000000000030','omega_3','Omega-3 fatty acids','20000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000003',true) on conflict(key) do update set is_core=true;
insert into public.user_nutrient_targets(user_id,nutrient_id,target_amount,minimum_amount,unit_id,target_type,methodology_id,calculation_version)
select p.user_id,n.id,case when p.biological_sex='female' then 1100 else 1600 end,case when p.biological_sex='female' then 1100 else 1600 end,n.default_unit_id,'minimum',m.id,'targets-v2'
from public.nutrition_profiles p join public.nutrients n on n.key='omega_3' join public.target_methodologies m on m.key='us_daily_value' on conflict(user_id,nutrient_id) do nothing;

insert into public.foods(id,name,brand,description,food_type,is_public,is_verified) values
('50000000-0000-0000-0000-000000000020','Protein powder, whey, generic',null,'Generic whey protein supplement; labels vary','generic',true,true),
('50000000-0000-0000-0000-000000000021','Multivitamin, adult, generic',null,'Generic adult multivitamin estimate; use the product label when available','generic',true,true),
('50000000-0000-0000-0000-000000000022','Fish oil supplement, generic',null,'Generic fish oil softgel with estimated omega-3 content','generic',true,true)
on conflict(id) do nothing;
insert into public.food_versions(id,food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload) values
('60000000-0000-0000-0000-000000000020','50000000-0000-0000-0000-000000000020',1,'10000000-0000-0000-0000-000000000001','supplement-whey-generic',75,true,'{"notice":"Generic estimate; compare with product label"}'),
('60000000-0000-0000-0000-000000000021','50000000-0000-0000-0000-000000000021',1,'10000000-0000-0000-0000-000000000001','supplement-multivitamin-generic',85,true,'{"notice":"Generic estimate; formulations vary substantially"}'),
('60000000-0000-0000-0000-000000000022','50000000-0000-0000-0000-000000000022',1,'10000000-0000-0000-0000-000000000001','supplement-fish-oil-generic',80,true,'{"notice":"Generic estimate; EPA and DHA vary by product"}')
on conflict(id) do nothing;
update public.foods f set current_version_id=v.id from public.food_versions v where v.food_id=f.id and f.id in('50000000-0000-0000-0000-000000000020','50000000-0000-0000-0000-000000000021','50000000-0000-0000-0000-000000000022');
insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,is_default) values
('60000000-0000-0000-0000-000000000020','1 scoop (30 g)',1,'scoop',30,true),
('60000000-0000-0000-0000-000000000021','1 tablet',1,'tablet',1,true),
('60000000-0000-0000-0000-000000000022','1 softgel (1 g)',1,'softgel',1,true)
on conflict do nothing;
with values_per_food(food_version_id,key,amount) as (values
('60000000-0000-0000-0000-000000000020'::uuid,'energy_kcal',400::numeric),('60000000-0000-0000-0000-000000000020','protein',80),('60000000-0000-0000-0000-000000000020','carbohydrate',8),('60000000-0000-0000-0000-000000000020','fat',6),('60000000-0000-0000-0000-000000000020','sodium',300),('60000000-0000-0000-0000-000000000020','calcium',500),('60000000-0000-0000-0000-000000000020','potassium',600),
('60000000-0000-0000-0000-000000000021','vitamin_a',90000),('60000000-0000-0000-0000-000000000021','vitamin_c',9000),('60000000-0000-0000-0000-000000000021','vitamin_d',2000),('60000000-0000-0000-0000-000000000021','vitamin_e',1500),('60000000-0000-0000-0000-000000000021','vitamin_k',12000),('60000000-0000-0000-0000-000000000021','thiamin',120),('60000000-0000-0000-0000-000000000021','riboflavin',130),('60000000-0000-0000-0000-000000000021','niacin',1600),('60000000-0000-0000-0000-000000000021','vitamin_b6',170),('60000000-0000-0000-0000-000000000021','folate',40000),('60000000-0000-0000-0000-000000000021','vitamin_b12',240),('60000000-0000-0000-0000-000000000021','iron',800),('60000000-0000-0000-0000-000000000021','zinc',1100),('60000000-0000-0000-0000-000000000021','selenium',5500),('60000000-0000-0000-0000-000000000021','copper',90),('60000000-0000-0000-0000-000000000021','manganese',230),
('60000000-0000-0000-0000-000000000022','energy_kcal',900),('60000000-0000-0000-0000-000000000022','fat',100),('60000000-0000-0000-0000-000000000022','omega_3',30000)
)
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select v.food_version_id,n.id,v.amount,n.default_unit_id,'inferred','Generic supplement estimate scaled per 100 g; user should compare with product label'
from values_per_food v join public.nutrients n on n.key=v.key on conflict(food_version_id,nutrient_id) do nothing;
insert into public.food_popularity(food_id,total_selections,unique_users,recent_selections,score) values
('50000000-0000-0000-0000-000000000020',500,100,50,95),('50000000-0000-0000-0000-000000000021',450,90,45,90),('50000000-0000-0000-0000-000000000022',425,85,42,88) on conflict(food_id) do nothing;
commit;
