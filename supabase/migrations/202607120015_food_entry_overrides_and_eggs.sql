begin;

insert into public.foods(id,name,brand,description,food_type,is_public,is_verified) values
('50000000-0000-0000-0000-000000000007','Egg, whole, cooked',null,'Generic whole cooked egg for quick logging','generic',true,true)
on conflict(id) do nothing;
insert into public.food_versions(id,food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload)
values('60000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000007',1,'10000000-0000-0000-0000-000000000001','demo-egg-whole-cooked',100,false,'{"notice":"Local demo reference data; replace with reviewed provider data before production"}')
on conflict(id) do nothing;
update public.foods set current_version_id='60000000-0000-0000-0000-000000000007' where id='50000000-0000-0000-0000-000000000007';
insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,is_default)
values('60000000-0000-0000-0000-000000000007','1 large egg',1,'egg',50,true) on conflict do nothing;

with egg_values(key,amount) as (values
('energy_kcal',155::numeric),('protein',12.6),('carbohydrate',1.12),('fat',10.6),('fiber',0),('sodium',124),
('vitamin_a',149),('vitamin_c',0),('vitamin_d',2.2),('vitamin_e',1.05),('vitamin_k',0.3),('thiamin',0.066),('riboflavin',0.513),('niacin',0.064),('pantothenic_acid',1.4),('vitamin_b6',0.121),('biotin',20),('folate',44),('vitamin_b12',1.11),('choline',294),
('iron',1.75),('calcium',50),('potassium',126),('magnesium',10),('zinc',1.05),('phosphorus',172),('selenium',30.7),('copper',0.072),('manganese',0.028)
)
insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_basis)
select '60000000-0000-0000-0000-000000000007',n.id,e.amount,n.default_unit_id,'provider_reported','Demo generic egg reference per 100 g; replace with reviewed provider data before production'
from egg_values e join public.nutrients n on n.key=e.key on conflict(food_version_id,nutrient_id) do nothing;
insert into public.food_popularity(food_id,total_selections,unique_users,recent_selections,score)
values('50000000-0000-0000-0000-000000000007',1000,250,100,100) on conflict(food_id) do update set score=100;

create or replace function public.apply_entry_nutrient_overrides(p_entry_id uuid,p_overrides jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare v_entry public.meal_entries%rowtype; item record; changed integer:=0; v_amount numeric; v_nutrient public.nutrients%rowtype;
begin
 if p_overrides is null or jsonb_typeof(p_overrides)<>'object' then return 0; end if;
 if (select count(*) from jsonb_each(p_overrides))>50 then raise exception 'Too many nutrient overrides'; end if;
 select e.* into v_entry from public.meal_entries e join public.meals m on m.id=e.meal_id join public.diary_days d on d.id=m.diary_day_id where e.id=p_entry_id and d.user_id=auth.uid();
 if v_entry.id is null then raise exception 'Entry not found'; end if;
 for item in select * from jsonb_each_text(p_overrides) loop
  if item.value is null or trim(item.value)='' then continue; end if;
  begin v_amount:=item.value::numeric; exception when others then raise exception 'Invalid nutrient amount'; end;
  if v_amount<0 or v_amount>10000000 then raise exception 'Nutrient amount out of range'; end if;
  select * into v_nutrient from public.nutrients where key=item.key;
  if v_nutrient.id is null then raise exception 'Unknown nutrient'; end if;
  insert into public.meal_entry_nutrient_snapshots(meal_entry_id,nutrient_id,amount,unit_id,value_classification,source_classification,source_amount_per_100g,calculation_basis,food_version_id)
  values(v_entry.id,v_nutrient.id,v_amount,v_nutrient.default_unit_id,'user_entered','user_entered',round(v_amount/v_entry.gram_weight*100,6),'User corrected amount for this diary serving',v_entry.food_version_id)
  on conflict(meal_entry_id,nutrient_id) do update set amount=excluded.amount,unit_id=excluded.unit_id,value_classification='user_entered',calculation_basis=excluded.calculation_basis,source_amount_per_100g=excluded.source_amount_per_100g,captured_at=now();
  changed:=changed+1;
 end loop;
 return changed;
end$$;
revoke all on function public.apply_entry_nutrient_overrides(uuid,jsonb) from public,anon;
grant execute on function public.apply_entry_nutrient_overrides(uuid,jsonb) to authenticated;

create or replace function public.log_food_entry_with_overrides(p_food_id uuid,p_grams numeric,p_meal_type text,p_date date,p_time time,p_notes text,p_overrides jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare entry_id uuid;
begin
 entry_id:=public.log_food_entry(p_food_id,p_grams,p_meal_type,p_date,p_time,p_notes);
 perform public.apply_entry_nutrient_overrides(entry_id,coalesce(p_overrides,'{}'::jsonb));
 return entry_id;
end$$;
revoke all on function public.log_food_entry_with_overrides(uuid,numeric,text,date,time,text,jsonb) from public,anon;
grant execute on function public.log_food_entry_with_overrides(uuid,numeric,text,date,time,text,jsonb) to authenticated;

commit;
