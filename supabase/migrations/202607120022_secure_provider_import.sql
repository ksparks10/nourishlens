begin;
create or replace function public.import_normalized_food(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare provider text:=p_payload->>'provider';provider_id text:=p_payload->>'providerId';source_id uuid;food_id uuid;version_id uuid;serving jsonb;item jsonb;nutrient public.nutrients%rowtype;source_unit text;target_unit text;amount numeric;conversion numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if provider not in('usda_fdc','open_food_facts','nih_dsld','health_canada_cnf') or length(provider_id)<1 then raise exception 'Unsupported provider';end if;
 if jsonb_array_length(coalesce(p_payload->'nutrients','[]'::jsonb))>100 then raise exception 'Too many nutrients';end if;
 select id into source_id from public.food_sources where key=provider;if source_id is null then raise exception 'Provider source missing';end if;
 select v.food_id into food_id from public.food_versions v join public.foods f on f.id=v.food_id where v.source_id=source_id and v.provider_record_id=provider_id and(f.owner_id=auth.uid() or f.is_public) limit 1;if food_id is not null then return food_id;end if;
 insert into public.foods(name,brand,description,food_type,owner_id,is_public,is_verified) values(left(coalesce(nullif(p_payload->>'name',''),'Imported food'),200),nullif(left(p_payload->>'brand',200),''),nullif(left(p_payload->>'description',1000),''),case when p_payload->>'foodType' in('generic','branded','restaurant') then p_payload->>'foodType' else 'generic' end,auth.uid(),false,false) returning id into food_id;
 insert into public.food_versions(food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload) values(food_id,1,source_id,provider_id,least(greatest(coalesce((p_payload->>'dataCompleteness')::integer,0),0),100),false,p_payload) returning id into version_id;update public.foods set current_version_id=version_id where id=food_id;
 serving:=coalesce((p_payload->'servings')->0,'{}'::jsonb);insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,milliliter_volume,is_default) values(version_id,left(coalesce(nullif(serving->>'label',''),'100 g'),100),greatest(coalesce((serving->>'amount')::numeric,1),.0001),left(coalesce(nullif(serving->>'unit',''),'serving'),30),coalesce((serving->>'gramWeight')::numeric,100),(serving->>'milliliterVolume')::numeric,true);
 for item in select * from jsonb_array_elements(coalesce(p_payload->'nutrients','[]'::jsonb)) loop
  select * into nutrient from public.nutrients where key=item->>'key';continue when nutrient.id is null or item->>'amountPer100g' is null;
  amount:=(item->>'amountPer100g')::numeric;if amount<0 or amount>100000000 then continue;end if;source_unit:=lower(replace(coalesce(item->>'unit',''),'µ','u'));select lower(replace(symbol,'µ','u')) into target_unit from public.nutrient_units where id=nutrient.default_unit_id;
  conversion:=case when source_unit=target_unit or(source_unit in('ug','mcg')and target_unit in('ug','mcg'))then 1 when source_unit='g'and target_unit='mg'then 1000 when source_unit='mg'and target_unit='g'then .001 when source_unit='mg'and target_unit in('ug','mcg')then 1000 when source_unit in('ug','mcg')and target_unit='mg'then .001 when source_unit='kcal'and target_unit='kcal'then 1 else null end;continue when conversion is null;
  insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_value,source_basis) values(version_id,nutrient.id,amount*conversion,nutrient.default_unit_id,case when item->>'classification'='confirmed_zero'then'confirmed_zero'else'provider_reported'end,amount,'Imported from '||provider||'; source unit '||source_unit) on conflict(food_version_id,nutrient_id)do nothing;
 end loop;
 if nullif(regexp_replace(coalesce(p_payload->>'barcode',''),'\D','','g'),'') is not null then insert into public.food_barcodes(food_id,barcode,provider_key) values(food_id,regexp_replace(p_payload->>'barcode','\D','','g'),provider) on conflict do nothing;end if;
 return food_id;
end$$;
revoke all on function public.import_normalized_food(jsonb) from public,anon;grant execute on function public.import_normalized_food(jsonb) to authenticated;
commit;
