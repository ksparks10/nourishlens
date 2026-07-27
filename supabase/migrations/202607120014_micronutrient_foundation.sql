begin;

insert into public.nutrient_units(id,symbol,name) values
('30000000-0000-0000-0000-000000000005','mcg','microgram')
on conflict(symbol) do nothing;

insert into public.nutrients(id,key,name,category_id,default_unit_id,is_core) values
('40000000-0000-0000-0000-000000000008','vitamin_a','Vitamin A','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000009','vitamin_c','Vitamin C','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000010','vitamin_d','Vitamin D','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000011','vitamin_e','Vitamin E','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000012','vitamin_k','Vitamin K','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000013','thiamin','Thiamin (B1)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000014','riboflavin','Riboflavin (B2)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000015','niacin','Niacin (B3)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000016','pantothenic_acid','Pantothenic acid (B5)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000017','vitamin_b6','Vitamin B6','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000018','biotin','Biotin (B7)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000019','folate','Folate (B9)','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000020','vitamin_b12','Vitamin B12','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000021','choline','Choline','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000022','calcium','Calcium','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000023','potassium','Potassium','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000024','magnesium','Magnesium','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000025','zinc','Zinc','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000026','phosphorus','Phosphorus','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000027','selenium','Selenium','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005',true),
('40000000-0000-0000-0000-000000000028','copper','Copper','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true),
('40000000-0000-0000-0000-000000000029','manganese','Manganese','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',true)
on conflict(key) do update set name=excluded.name,category_id=excluded.category_id,default_unit_id=excluded.default_unit_id,is_core=true;

-- Demo-only values make the local catalog useful while retaining explicit provenance.
with values_per_food(food_id,nutrient_key,amount) as (values
('50000000-0000-0000-0000-000000000005'::uuid,'vitamin_a',3),('50000000-0000-0000-0000-000000000005'::uuid,'vitamin_c',4.6),('50000000-0000-0000-0000-000000000005'::uuid,'vitamin_e',0.18),('50000000-0000-0000-0000-000000000005'::uuid,'vitamin_k',2.2),('50000000-0000-0000-0000-000000000005'::uuid,'potassium',107),('50000000-0000-0000-0000-000000000005'::uuid,'calcium',6),('50000000-0000-0000-0000-000000000005'::uuid,'magnesium',5),('50000000-0000-0000-0000-000000000005'::uuid,'phosphorus',11),('50000000-0000-0000-0000-000000000005'::uuid,'folate',3),
('50000000-0000-0000-0000-000000000006'::uuid,'vitamin_d',0.2),('50000000-0000-0000-0000-000000000006'::uuid,'riboflavin',0.4),('50000000-0000-0000-0000-000000000006'::uuid,'niacin',3.6),('50000000-0000-0000-0000-000000000006'::uuid,'pantothenic_acid',1.5),('50000000-0000-0000-0000-000000000006'::uuid,'potassium',318),('50000000-0000-0000-0000-000000000006'::uuid,'phosphorus',86),('50000000-0000-0000-0000-000000000006'::uuid,'selenium',9.3),('50000000-0000-0000-0000-000000000006'::uuid,'copper',0.32),
('50000000-0000-0000-0000-000000000004'::uuid,'calcium',88),('50000000-0000-0000-0000-000000000004'::uuid,'potassium',137),('50000000-0000-0000-0000-000000000004'::uuid,'phosphorus',151),('50000000-0000-0000-0000-000000000004'::uuid,'zinc',0.8),('50000000-0000-0000-0000-000000000004'::uuid,'vitamin_b12',0.3),('50000000-0000-0000-0000-000000000004'::uuid,'folate',18)
)
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select f.current_version_id,n.id,v.amount,n.default_unit_id,'provider_reported','Demo reference value; replace with reviewed provider data before production'
from values_per_food v join public.foods f on f.id=v.food_id join public.nutrients n on n.key=v.nutrient_key
on conflict(food_version_id,nutrient_id) do nothing;

-- Backfill existing profiles with general adult reference targets. Future onboarding uses the application target engine.
insert into public.user_nutrient_targets(user_id,nutrient_id,target_amount,minimum_amount,maximum_amount,unit_id,target_type,methodology_id,calculation_version)
select p.user_id,n.id,t.amount,t.amount,t.upper_limit,n.default_unit_id,case when t.upper_limit is null then 'minimum' else 'range' end,m.id,'targets-v2'
from public.nutrition_profiles p
cross join lateral (values
('vitamin_a',case when p.biological_sex='female' then 700 else 900 end::numeric,3000::numeric),('vitamin_c',case when p.biological_sex='female' then 75 else 90 end,2000),('vitamin_d',15,100),('vitamin_e',15,1000),('vitamin_k',case when p.biological_sex='female' then 90 else 120 end,null),('thiamin',case when p.biological_sex='female' then 1.1 else 1.2 end,null),('riboflavin',case when p.biological_sex='female' then 1.1 else 1.3 end,null),('niacin',case when p.biological_sex='female' then 14 else 16 end,35),('pantothenic_acid',5,null),('vitamin_b6',1.3,100),('biotin',30,null),('folate',400,1000),('vitamin_b12',2.4,null),('choline',case when p.biological_sex='female' then 425 else 550 end,3500),('iron',case when p.biological_sex='female' then 18 else 8 end,45),('calcium',case when extract(year from age(p.birth_date))<19 then 1300 else 1000 end,2500),('potassium',case when p.biological_sex='female' then 2600 else 3400 end,null),('magnesium',case when p.biological_sex='female' then 320 else 420 end,350),('zinc',case when p.biological_sex='female' then 8 else 11 end,40),('phosphorus',700,4000),('selenium',55,400),('copper',0.9,10),('manganese',case when p.biological_sex='female' then 1.8 else 2.3 end,11)
) t(key,amount,upper_limit)
join public.nutrients n on n.key=t.key
join public.target_methodologies m on m.key='us_daily_value'
on conflict(user_id,nutrient_id) do nothing;

create or replace function public.daily_nutrient_totals(p_date date)
returns table(nutrient_id uuid,nutrient_key text,nutrient_name text,unit text,confirmed_amount numeric,calculated_amount numeric,projected_amount numeric,user_entered_amount numeric,total_excluding_projections numeric,total_including_projections numeric,missing_count bigint,food_count bigint)
language sql stable security invoker set search_path='' as $$
 with entries as (
  select e.id from public.diary_days d join public.meals m on m.diary_day_id=d.id join public.meal_entries e on e.meal_id=m.id
  where d.user_id=auth.uid() and d.diary_date=p_date
 )
 select n.id,n.key,n.name,u.symbol,
 coalesce(sum(s.amount) filter(where s.value_classification in('measured','provider_reported','confirmed_zero')),0),
 coalesce(sum(s.amount) filter(where s.value_classification='calculated'),0),coalesce(sum(s.amount) filter(where s.value_classification='projected'),0),coalesce(sum(s.amount) filter(where s.value_classification='user_entered'),0),
 coalesce(sum(s.amount) filter(where s.value_classification not in('projected','not_reported','not_applicable')),0),coalesce(sum(s.amount) filter(where s.value_classification not in('not_reported','not_applicable')),0),
 count(e.id) filter(where s.id is null or s.value_classification='not_reported'),count(distinct e.id)
 from public.nutrients n join public.nutrient_units u on u.id=n.default_unit_id cross join entries e
 left join public.meal_entry_nutrient_snapshots s on s.meal_entry_id=e.id and s.nutrient_id=n.id
 where n.is_core group by n.id,n.key,n.name,u.symbol order by n.name;
$$;

commit;
