begin;
create table public.nutrition_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null check(birth_date<=current_date-interval '13 years'),
  height_cm numeric(7,2) not null check(height_cm between 80 and 260),
  weight_kg numeric(7,2) not null check(weight_kg between 25 and 500),
  measurement_system text not null check(measurement_system in ('metric','us')),
  biological_sex text not null check(biological_sex in ('female','male','unspecified')),
  activity_level text not null check(activity_level in ('sedentary','light','moderate','very_active','extra_active')),
  primary_goal text not null check(primary_goal in ('maintain','lose','gain','build_muscle','diet_quality','micronutrients','custom')),
  dietary_pattern text not null default 'no_preference', pregnancy_status text not null default 'not_applicable',
  target_weight_kg numeric(7,2), custom_calorie_target numeric(8,2), custom_protein_target numeric(8,2),
  calculation_version text not null default 'targets-v1', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger nutrition_profiles_updated before update on public.nutrition_profiles for each row execute function public.set_updated_at();
create table public.target_methodologies (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, source_name text not null, source_version text not null, effective_date date not null, description text not null);
create table public.user_nutrient_targets (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, nutrient_id uuid not null references public.nutrients, target_amount numeric(18,6), minimum_amount numeric(18,6), maximum_amount numeric(18,6), unit_id uuid not null references public.nutrient_units, target_type text not null check(target_type in ('minimum','range','maximum','upper_limit','informational','none')), methodology_id uuid not null references public.target_methodologies, calculation_version text not null, is_overridden boolean not null default false, effective_at timestamptz not null default now(), unique(user_id,nutrient_id));

create table public.meal_types (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, sort_order integer not null);
create table public.diary_days (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, diary_date date not null, notes text, created_at timestamptz not null default now(), unique(user_id,diary_date));
create table public.meals (id uuid primary key default gen_random_uuid(), diary_day_id uuid not null references public.diary_days on delete cascade, meal_type_id uuid not null references public.meal_types, custom_name text, notes text, sort_order integer not null default 0, created_at timestamptz not null default now(), unique(diary_day_id,meal_type_id));
create table public.meal_entries (id uuid primary key default gen_random_uuid(), meal_id uuid not null references public.meals on delete cascade, food_id uuid not null references public.foods, food_version_id uuid not null references public.food_versions, serving_id uuid references public.food_servings, food_name_snapshot text not null, brand_snapshot text, quantity numeric(12,4) not null check(quantity>0), unit text not null, gram_weight numeric(12,4) not null check(gram_weight>0), logged_at timestamptz not null, notes text, sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger meal_entries_updated before update on public.meal_entries for each row execute function public.set_updated_at();
create table public.meal_entry_nutrient_snapshots (id uuid primary key default gen_random_uuid(), meal_entry_id uuid not null references public.meal_entries on delete cascade, nutrient_id uuid not null references public.nutrients, amount numeric(18,6), unit_id uuid not null references public.nutrient_units, value_classification text not null check(value_classification in ('measured','provider_reported','calculated','projected','inferred','user_entered','confirmed_zero','not_reported','not_applicable')), source_classification text not null, source_amount_per_100g numeric(18,6), calculation_basis text not null, food_version_id uuid not null references public.food_versions, captured_at timestamptz not null default now(), unique(meal_entry_id,nutrient_id));

create or replace function public.log_food_entry(p_food_id uuid,p_grams numeric,p_meal_type text,p_date date,p_time time default '12:00',p_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_day uuid;v_meal uuid;v_entry uuid;v_food public.foods%rowtype;v_version uuid;v_meal_type uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_grams<=0 or p_grams>10000 then raise exception 'Invalid serving amount'; end if;
 select * into v_food from public.foods where id=p_food_id and deleted_at is null and (is_public or owner_id=auth.uid());
 if v_food.id is null then raise exception 'Food not found'; end if;
 v_version:=v_food.current_version_id;
 select id into v_meal_type from public.meal_types where key=p_meal_type;
 if v_meal_type is null then raise exception 'Meal type not found'; end if;
 insert into public.diary_days(user_id,diary_date) values(auth.uid(),p_date) on conflict(user_id,diary_date) do update set diary_date=excluded.diary_date returning id into v_day;
 insert into public.meals(diary_day_id,meal_type_id,sort_order) values(v_day,v_meal_type,(select sort_order from public.meal_types where id=v_meal_type)) on conflict(diary_day_id,meal_type_id) do update set meal_type_id=excluded.meal_type_id returning id into v_meal;
 insert into public.meal_entries(meal_id,food_id,food_version_id,food_name_snapshot,brand_snapshot,quantity,unit,gram_weight,logged_at,notes)
 values(v_meal,v_food.id,v_version,v_food.name,v_food.brand,p_grams,'g',p_grams,(p_date+p_time) at time zone 'UTC',nullif(trim(p_notes),'')) returning id into v_entry;
 insert into public.meal_entry_nutrient_snapshots(meal_entry_id,nutrient_id,amount,unit_id,value_classification,source_classification,source_amount_per_100g,calculation_basis,food_version_id)
 select v_entry,nutrient_id,case when amount_per_100g is null then null else round(amount_per_100g*p_grams/100,6) end,unit_id,
 case when classification in ('not_reported','not_applicable','confirmed_zero','user_entered','projected') then classification else 'calculated' end,
 classification,amount_per_100g,'scaled from per-100g value using logged gram weight',v_version
 from public.food_version_nutrients where food_version_id=v_version;
 return v_entry;
end $$;
revoke all on function public.log_food_entry(uuid,numeric,text,date,time,text) from public,anon;
grant execute on function public.log_food_entry(uuid,numeric,text,date,time,text) to authenticated;

create or replace function public.update_food_entry(p_entry_id uuid,p_grams numeric,p_meal_type text,p_notes text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_entry public.meal_entries%rowtype;v_day uuid;v_meal uuid;v_meal_type uuid;
begin
 if p_grams<=0 or p_grams>10000 then raise exception 'Invalid serving amount'; end if;
 select e.* into v_entry from public.meal_entries e join public.meals m on m.id=e.meal_id join public.diary_days d on d.id=m.diary_day_id where e.id=p_entry_id and d.user_id=auth.uid() for update;
 if v_entry.id is null then raise exception 'Entry not found'; end if;
 select m.diary_day_id into v_day from public.meals m where m.id=v_entry.meal_id;
 select id into v_meal_type from public.meal_types where key=p_meal_type;
 if v_meal_type is null then raise exception 'Meal type not found'; end if;
 insert into public.meals(diary_day_id,meal_type_id,sort_order) values(v_day,v_meal_type,(select sort_order from public.meal_types where id=v_meal_type)) on conflict(diary_day_id,meal_type_id) do update set meal_type_id=excluded.meal_type_id returning id into v_meal;
 update public.meal_entries set meal_id=v_meal,quantity=p_grams,unit='g',gram_weight=p_grams,notes=nullif(trim(p_notes),'') where id=p_entry_id;
 delete from public.meal_entry_nutrient_snapshots where meal_entry_id=p_entry_id;
 insert into public.meal_entry_nutrient_snapshots(meal_entry_id,nutrient_id,amount,unit_id,value_classification,source_classification,source_amount_per_100g,calculation_basis,food_version_id)
 select p_entry_id,nutrient_id,case when amount_per_100g is null then null else round(amount_per_100g*p_grams/100,6) end,unit_id,case when classification in ('not_reported','not_applicable','confirmed_zero','user_entered','projected') then classification else 'calculated' end,classification,amount_per_100g,'entry edited; rescaled from originally logged food version',v_entry.food_version_id from public.food_version_nutrients where food_version_id=v_entry.food_version_id;
end $$;
revoke all on function public.update_food_entry(uuid,numeric,text,text) from public,anon;grant execute on function public.update_food_entry(uuid,numeric,text,text) to authenticated;

create or replace function public.duplicate_food_entry(p_entry_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare source public.meal_entries%rowtype;new_id uuid;
begin
 select e.* into source from public.meal_entries e join public.meals m on m.id=e.meal_id join public.diary_days d on d.id=m.diary_day_id where e.id=p_entry_id and d.user_id=auth.uid();
 if source.id is null then raise exception 'Entry not found'; end if;
 insert into public.meal_entries(meal_id,food_id,food_version_id,serving_id,food_name_snapshot,brand_snapshot,quantity,unit,gram_weight,logged_at,notes,sort_order) values(source.meal_id,source.food_id,source.food_version_id,source.serving_id,source.food_name_snapshot,source.brand_snapshot,source.quantity,source.unit,source.gram_weight,source.logged_at,source.notes,source.sort_order+1) returning id into new_id;
 insert into public.meal_entry_nutrient_snapshots(meal_entry_id,nutrient_id,amount,unit_id,value_classification,source_classification,source_amount_per_100g,calculation_basis,food_version_id,captured_at) select new_id,nutrient_id,amount,unit_id,value_classification,source_classification,source_amount_per_100g,'duplicated from diary snapshot',food_version_id,now() from public.meal_entry_nutrient_snapshots where meal_entry_id=p_entry_id;
 return new_id;
end $$;
revoke all on function public.duplicate_food_entry(uuid) from public,anon;grant execute on function public.duplicate_food_entry(uuid) to authenticated;

create or replace function public.daily_nutrient_totals(p_date date)
returns table(nutrient_id uuid,nutrient_key text,nutrient_name text,unit text,confirmed_amount numeric,calculated_amount numeric,projected_amount numeric,user_entered_amount numeric,total_excluding_projections numeric,total_including_projections numeric,missing_count bigint,food_count bigint)
language sql stable security invoker set search_path='' as $$
 select n.id,n.key,n.name,u.symbol,
 coalesce(sum(s.amount) filter(where s.value_classification in('measured','provider_reported','confirmed_zero')),0),
 coalesce(sum(s.amount) filter(where s.value_classification='calculated'),0),coalesce(sum(s.amount) filter(where s.value_classification='projected'),0),coalesce(sum(s.amount) filter(where s.value_classification='user_entered'),0),
 coalesce(sum(s.amount) filter(where s.value_classification not in('projected','not_reported','not_applicable')),0),coalesce(sum(s.amount) filter(where s.value_classification not in('not_reported','not_applicable')),0),
 count(*) filter(where s.value_classification='not_reported'),count(distinct e.id)
 from public.diary_days d join public.meals m on m.diary_day_id=d.id join public.meal_entries e on e.meal_id=m.id join public.meal_entry_nutrient_snapshots s on s.meal_entry_id=e.id join public.nutrients n on n.id=s.nutrient_id join public.nutrient_units u on u.id=s.unit_id
 where d.user_id=auth.uid() and d.diary_date=p_date group by n.id,n.key,n.name,u.symbol order by n.name;
$$;
grant execute on function public.daily_nutrient_totals(date) to authenticated;

insert into public.target_methodologies(id,key,name,source_name,source_version,effective_date,description) values ('70000000-0000-0000-0000-000000000001','application_energy_v1','Application energy estimate','Mifflin-St Jeor with activity and goal adjustment','v1','2026-07-11','Planning estimate; not medical advice'),('70000000-0000-0000-0000-000000000002','application_macro_v1','Application macro distribution','Application-derived recommendation','v1','2026-07-11','Initial balanced macro distribution'),('70000000-0000-0000-0000-000000000003','us_daily_value','US Daily Value','FDA Daily Values','current at implementation','2026-07-11','General reference value, not a personalized RDA');
insert into public.meal_types(id,key,name,sort_order) values ('80000000-0000-0000-0000-000000000001','breakfast','Breakfast',10),('80000000-0000-0000-0000-000000000002','morning_snack','Morning snack',20),('80000000-0000-0000-0000-000000000003','lunch','Lunch',30),('80000000-0000-0000-0000-000000000004','afternoon_snack','Afternoon snack',40),('80000000-0000-0000-0000-000000000005','dinner','Dinner',50),('80000000-0000-0000-0000-000000000006','evening_snack','Evening snack',60);

alter table public.nutrition_profiles enable row level security;alter table public.target_methodologies enable row level security;alter table public.user_nutrient_targets enable row level security;alter table public.meal_types enable row level security;alter table public.diary_days enable row level security;alter table public.meals enable row level security;alter table public.meal_entries enable row level security;alter table public.meal_entry_nutrient_snapshots enable row level security;
create policy nutrition_profiles_own on public.nutrition_profiles for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy target_methods_read on public.target_methodologies for select to authenticated using(true);
create policy targets_own on public.user_nutrient_targets for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy meal_types_read on public.meal_types for select to authenticated using(true);
create policy diary_days_own on public.diary_days for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy meals_own on public.meals for all using(exists(select 1 from public.diary_days d where d.id=diary_day_id and d.user_id=auth.uid())) with check(exists(select 1 from public.diary_days d where d.id=diary_day_id and d.user_id=auth.uid()));
create policy entries_own on public.meal_entries for all using(exists(select 1 from public.meals m join public.diary_days d on d.id=m.diary_day_id where m.id=meal_id and d.user_id=auth.uid())) with check(exists(select 1 from public.meals m join public.diary_days d on d.id=m.diary_day_id where m.id=meal_id and d.user_id=auth.uid()));
create policy snapshots_own_read on public.meal_entry_nutrient_snapshots for select using(exists(select 1 from public.meal_entries e join public.meals m on m.id=e.meal_id join public.diary_days d on d.id=m.diary_day_id where e.id=meal_entry_id and d.user_id=auth.uid()));
-- Snapshots are only created through the logging function and never browser-updated.
commit;
