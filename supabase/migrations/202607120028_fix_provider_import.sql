begin;
create or replace function public.import_normalized_food(p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_provider text:=p_payload->>'provider';v_provider_id text:=p_payload->>'providerId';v_source_id uuid;v_food_id uuid;v_version_id uuid;v_serving jsonb;v_item jsonb;v_nutrient public.nutrients%rowtype;v_source_unit text;v_target_unit text;v_amount numeric;v_conversion numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if v_provider not in('usda_fdc','open_food_facts','nih_dsld','health_canada_cnf') or length(v_provider_id)<1 then raise exception 'Unsupported provider';end if;
 if jsonb_array_length(coalesce(p_payload->'nutrients','[]'::jsonb))>100 then raise exception 'Too many nutrients';end if;
 select fs.id into v_source_id from public.food_sources fs where fs.key=v_provider;if v_source_id is null then raise exception 'Provider source missing';end if;
 select fv.food_id into v_food_id from public.food_versions fv join public.foods f on f.id=fv.food_id where fv.source_id=v_source_id and fv.provider_record_id=v_provider_id and(f.owner_id=auth.uid() or f.is_public) limit 1;if v_food_id is not null then return v_food_id;end if;
 insert into public.foods(name,brand,description,food_type,owner_id,is_public,is_verified) values(left(coalesce(nullif(p_payload->>'name',''),'Imported food'),200),nullif(left(p_payload->>'brand',200),''),nullif(left(p_payload->>'description',1000),''),case when p_payload->>'foodType' in('generic','branded','restaurant') then p_payload->>'foodType' else 'generic' end,auth.uid(),false,false) returning id into v_food_id;
 insert into public.food_versions(food_id,version,source_id,provider_record_id,data_completeness,contains_projections,source_payload) values(v_food_id,1,v_source_id,v_provider_id,least(greatest(coalesce((p_payload->>'dataCompleteness')::integer,0),0),100),false,p_payload) returning id into v_version_id;update public.foods set current_version_id=v_version_id where id=v_food_id;
 v_serving:=coalesce((p_payload->'servings')->0,'{}'::jsonb);insert into public.food_servings(food_version_id,label,amount,unit,gram_weight,milliliter_volume,is_default) values(v_version_id,left(coalesce(nullif(v_serving->>'label',''),'100 g'),100),greatest(coalesce((v_serving->>'amount')::numeric,1),.0001),left(coalesce(nullif(v_serving->>'unit',''),'serving'),30),coalesce((v_serving->>'gramWeight')::numeric,100),(v_serving->>'milliliterVolume')::numeric,true);
 for v_item in select value from jsonb_array_elements(coalesce(p_payload->'nutrients','[]'::jsonb)) loop
  select n.* into v_nutrient from public.nutrients n where n.key=v_item->>'key';continue when v_nutrient.id is null or v_item->>'amountPer100g' is null;
  v_amount:=(v_item->>'amountPer100g')::numeric;if v_amount<0 or v_amount>100000000 then continue;end if;v_source_unit:=lower(replace(coalesce(v_item->>'unit',''),'µ','u'));select lower(replace(nu.symbol,'µ','u')) into v_target_unit from public.nutrient_units nu where nu.id=v_nutrient.default_unit_id;
  v_conversion:=case when v_source_unit=v_target_unit or(v_source_unit in('ug','mcg')and v_target_unit in('ug','mcg'))then 1 when v_source_unit='g'and v_target_unit='mg'then 1000 when v_source_unit='mg'and v_target_unit='g'then .001 when v_source_unit='mg'and v_target_unit in('ug','mcg')then 1000 when v_source_unit in('ug','mcg')and v_target_unit='mg'then .001 when v_source_unit='kcal'and v_target_unit='kcal'then 1 else null end;continue when v_conversion is null;
  insert into public.food_version_nutrients(food_version_id,nutrient_id,amount_per_100g,unit_id,classification,source_value,source_basis) values(v_version_id,v_nutrient.id,v_amount*v_conversion,v_nutrient.default_unit_id,case when v_item->>'classification'='confirmed_zero'then'confirmed_zero'else'provider_reported'end,v_amount,'Imported from '||v_provider||'; source unit '||v_source_unit) on conflict(food_version_id,nutrient_id)do nothing;
 end loop;
 if nullif(regexp_replace(coalesce(p_payload->>'barcode',''),'\D','','g'),'') is not null then insert into public.food_barcodes(food_id,barcode,provider_key) values(v_food_id,regexp_replace(p_payload->>'barcode','\D','','g'),v_provider) on conflict do nothing;end if;
 return v_food_id;
end$$;
revoke all on function public.import_normalized_food(jsonb) from public,anon;
grant execute on function public.import_normalized_food(jsonb) to authenticated;
commit;
