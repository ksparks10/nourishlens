begin;

insert into public.target_methodologies(key,name,source_name,source_version,effective_date,description)
values
('who_fat_guideline_2023','WHO energy-based fat limit','World Health Organization','2023','2023-07-17','Saturated fat below 10% and trans fat below 1% of daily energy.'),
('national_academies_dri','Dietary Reference Intake','National Academies of Sciences, Engineering, and Medicine','current','2026-07-12','Age-, sex-, or weight-based RDA or Adequate Intake reference for healthy people.'),
('personal_tracking_goal','Personal tracking goal','User selected','current','2026-07-12','A personal tracking preference, not an established dietary recommendation.'),
('informational_only','No established daily target','Informational tracking only','current','2026-07-12','Tracked for information because no authoritative standalone daily target is established.')
on conflict(key) do update set name=excluded.name,source_name=excluded.source_name,source_version=excluded.source_version,effective_date=excluded.effective_date,description=excluded.description;

with calculated as (
  select t.id,n.key,
    case n.key
      when 'saturated_fat' then round(coalesce(energy.target_amount,2000)*.10/9,1)
      when 'trans_fat' then round(coalesce(energy.target_amount,2000)*.01/9,1)
      when 'cholesterol' then 300
      when 'added_sugars' then 50
      when 'ala' then case when p.biological_sex='female' then 1100 else 1600 end
      when 'omega_6' then case when p.biological_sex='female' then case when extract(year from age(p.birth_date))>50 then 11000 else 12000 end else case when extract(year from age(p.birth_date))>50 then 14000 else 17000 end end
      when 'leucine' then round(p.weight_kg*.042,2)
      when 'lysine' then round(p.weight_kg*.038,2)
      when 'tryptophan' then round(p.weight_kg*.005,2)
      when 'threonine' then round(p.weight_kg*.020,2)
      when 'isoleucine' then round(p.weight_kg*.019,2)
      when 'valine' then round(p.weight_kg*.024,2)
      when 'iodine' then 150
      when 'chromium' then case when p.biological_sex='female' then case when extract(year from age(p.birth_date))>50 then 20 else 25 end else case when extract(year from age(p.birth_date))>50 then 30 else 35 end end
      when 'molybdenum' then 45
      when 'fluoride' then case when p.biological_sex='female' then 3 else 4 end
      when 'chloride' then 2300
      when 'water' then case when p.biological_sex='female' then 2700 else 3700 end
    end::numeric amount,
    case when n.key in('saturated_fat','trans_fat','cholesterol','added_sugars') then 'maximum' else 'minimum' end target_type,
    case when n.key in('saturated_fat','trans_fat') then 'who_fat_guideline_2023' when n.key in('cholesterol','added_sugars') then 'us_daily_value' else 'national_academies_dri' end methodology
  from public.user_nutrient_targets t
  join public.nutrients n on n.id=t.nutrient_id
  join public.nutrition_profiles p on p.user_id=t.user_id
  left join public.nutrients energy_n on energy_n.key='energy_kcal'
  left join public.user_nutrient_targets energy on energy.user_id=t.user_id and energy.nutrient_id=energy_n.id
  where n.key in('saturated_fat','trans_fat','cholesterol','added_sugars','ala','omega_6','leucine','lysine','tryptophan','threonine','isoleucine','valine','iodine','chromium','molybdenum','fluoride','chloride','water') and not t.is_overridden
)
update public.user_nutrient_targets t set
  target_amount=c.amount,
  minimum_amount=case when c.target_type='minimum' then c.amount else null end,
  maximum_amount=case when c.target_type='maximum' then c.amount else null end,
  target_type=c.target_type,
  methodology_id=m.id,
  calculation_version='targets-v3'
from calculated c join public.target_methodologies m on m.key=c.methodology
where t.id=c.id;

update public.user_nutrient_targets t set methodology_id=m.id,calculation_version='targets-v3'
from public.target_methodologies m
where m.key='informational_only' and t.target_type='informational' and not t.is_overridden;

create or replace function public.ensure_advanced_informational_targets()returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.user_nutrient_targets(user_id,nutrient_id,target_amount,minimum_amount,maximum_amount,unit_id,target_type,methodology_id,calculation_version)
 select new.user_id,n.id,null,null,null,n.default_unit_id,'informational',m.id,'targets-v3'
 from public.nutrients n join public.target_methodologies m on m.key='informational_only'
 where n.category_id in(select id from public.nutrient_categories where key in('sugars','amino_acids','trace_elements','bioactive_compounds','polyphenols')) or n.key in('saturated_fat','monounsaturated_fat','polyunsaturated_fat','trans_fat','cholesterol','omega_6','ala','epa','dha')
 on conflict(user_id,nutrient_id)do nothing;
 return new;
end$$;

commit;
