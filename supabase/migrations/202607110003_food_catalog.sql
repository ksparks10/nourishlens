begin;
create extension if not exists pg_trgm;

create table public.food_sources (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, base_url text, is_active boolean not null default true, created_at timestamptz not null default now());
create table public.foods (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users on delete cascade, name text not null, brand text, description text, food_type text not null check(food_type in ('generic','branded','custom','restaurant','recipe')), is_public boolean not null default false, is_verified boolean not null default false, search_text text generated always as (lower(trim(coalesce(brand,'')||' '||name||' '||coalesce(description,'')))) stored, current_version_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create index foods_search_trgm on public.foods using gin(search_text gin_trgm_ops) where deleted_at is null;
create table public.food_versions (id uuid primary key default gen_random_uuid(), food_id uuid not null references public.foods on delete cascade, version integer not null, source_id uuid references public.food_sources, provider_record_id text, ingredients text, data_completeness smallint not null default 0 check(data_completeness between 0 and 100), contains_projections boolean not null default false, source_payload jsonb, published_at timestamptz not null default now(), unique(food_id,version), unique(source_id,provider_record_id));
alter table public.foods add constraint foods_current_version_fk foreign key(current_version_id) references public.food_versions(id);
create table public.food_servings (id uuid primary key default gen_random_uuid(), food_version_id uuid not null references public.food_versions on delete cascade, label text not null, amount numeric(12,4) not null check(amount>0), unit text not null, gram_weight numeric(12,4) check(gram_weight>0), milliliter_volume numeric(12,4) check(milliliter_volume>0), is_default boolean not null default false, sort_order integer not null default 0);
create unique index one_default_serving on public.food_servings(food_version_id) where is_default;
create table public.nutrient_categories (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, sort_order integer not null default 0);
create table public.nutrient_units (id uuid primary key default gen_random_uuid(), symbol text not null unique, name text not null);
create table public.nutrients (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, category_id uuid not null references public.nutrient_categories, default_unit_id uuid not null references public.nutrient_units, provider_codes jsonb not null default '{}', is_core boolean not null default false);
create table public.food_version_nutrients (id uuid primary key default gen_random_uuid(), food_version_id uuid not null references public.food_versions on delete cascade, nutrient_id uuid not null references public.nutrients, amount_per_100g numeric(18,6), unit_id uuid not null references public.nutrient_units, classification text not null check(classification in ('measured','provider_reported','calculated','projected','inferred','user_entered','confirmed_zero','not_reported','not_applicable')), source_value numeric(18,6), source_basis text, created_at timestamptz not null default now(), unique(food_version_id,nutrient_id), check((classification in ('not_reported','not_applicable') and amount_per_100g is null) or (classification not in ('not_reported','not_applicable') and amount_per_100g is not null)));
create table public.food_barcodes (food_id uuid not null references public.foods on delete cascade, barcode text not null unique check(barcode~'^[0-9]{8,14}$'), source_id uuid references public.food_sources, primary key(food_id,barcode));
create table public.food_images (id uuid primary key default gen_random_uuid(), food_id uuid not null references public.foods on delete cascade, url text not null, alt_text text not null, source_id uuid references public.food_sources, is_primary boolean not null default false);
create table public.food_popularity (food_id uuid primary key references public.foods on delete cascade, total_selections bigint not null default 0, unique_users bigint not null default 0, recent_selections bigint not null default 0, score numeric(12,4) not null default 0, updated_at timestamptz not null default now());
create table public.provider_api_logs (id bigint generated always as identity primary key, provider_key text not null, operation text not null, status_code integer, duration_ms integer, success boolean not null, error_code text, created_at timestamptz not null default now());
create table public.provider_food_cache (provider_key text not null, provider_record_id text not null, normalized_payload jsonb not null, fetched_at timestamptz not null default now(), expires_at timestamptz not null, primary key(provider_key,provider_record_id));

create or replace function public.search_food_catalog(search_query text, result_limit integer default 20, result_offset integer default 0)
returns table(id uuid,name text,brand text,food_type text,is_verified boolean,data_completeness smallint,contains_projections boolean,source_key text,serving_label text,serving_grams numeric,calories numeric)
language sql stable security invoker set search_path='' as $$
 select f.id,f.name,f.brand,f.food_type,f.is_verified,v.data_completeness,v.contains_projections,s.key,sv.label,sv.gram_weight,cal.amount_per_100g*(sv.gram_weight/100)
 from public.foods f join public.food_versions v on v.id=f.current_version_id left join public.food_sources s on s.id=v.source_id
 left join public.food_servings sv on sv.food_version_id=v.id and sv.is_default
 left join public.food_version_nutrients cal on cal.food_version_id=v.id and cal.nutrient_id=(select id from public.nutrients where key='energy_kcal')
 left join public.food_popularity pop on pop.food_id=f.id
 where f.deleted_at is null and (f.is_public or f.owner_id=auth.uid()) and (trim(search_query)='' or f.search_text operator(public.%) lower(trim(search_query)) or f.search_text like '%'||lower(trim(search_query))||'%')
 order by (f.search_text=lower(trim(search_query))) desc, public.similarity(f.search_text,lower(trim(search_query))) desc, f.is_verified desc, v.data_completeness desc, coalesce(pop.score,0) desc
 limit least(greatest(result_limit,1),50) offset greatest(result_offset,0);
$$;
grant execute on function public.search_food_catalog(text,integer,integer) to authenticated;

alter table public.food_sources enable row level security; alter table public.foods enable row level security; alter table public.food_versions enable row level security; alter table public.food_servings enable row level security; alter table public.nutrient_categories enable row level security; alter table public.nutrient_units enable row level security; alter table public.nutrients enable row level security; alter table public.food_version_nutrients enable row level security; alter table public.food_barcodes enable row level security; alter table public.food_images enable row level security; alter table public.food_popularity enable row level security; alter table public.provider_api_logs enable row level security; alter table public.provider_food_cache enable row level security;
create policy food_sources_read on public.food_sources for select to authenticated using(true);
create policy foods_read on public.foods for select to authenticated using(is_public or owner_id=auth.uid());
create policy foods_owner_create on public.foods for insert to authenticated with check(owner_id=auth.uid() and not is_public and not is_verified);
create policy foods_owner_update on public.foods for update to authenticated using(owner_id=auth.uid() and not is_public) with check(owner_id=auth.uid() and not is_public and not is_verified);
create policy food_versions_read on public.food_versions for select to authenticated using(exists(select 1 from public.foods f where f.id=food_id and (f.is_public or f.owner_id=auth.uid())));
create policy food_servings_read on public.food_servings for select to authenticated using(exists(select 1 from public.food_versions v join public.foods f on f.id=v.food_id where v.id=food_version_id and (f.is_public or f.owner_id=auth.uid())));
create policy nutrient_categories_read on public.nutrient_categories for select to authenticated using(true);
create policy nutrient_units_read on public.nutrient_units for select to authenticated using(true);
create policy nutrients_read on public.nutrients for select to authenticated using(true);
create policy food_nutrients_read on public.food_version_nutrients for select to authenticated using(exists(select 1 from public.food_versions v join public.foods f on f.id=v.food_id where v.id=food_version_id and (f.is_public or f.owner_id=auth.uid())));
create policy food_barcodes_read on public.food_barcodes for select to authenticated using(exists(select 1 from public.foods f where f.id=food_id and (f.is_public or f.owner_id=auth.uid())));
create policy food_images_read on public.food_images for select to authenticated using(exists(select 1 from public.foods f where f.id=food_id and (f.is_public or f.owner_id=auth.uid())));
create policy popularity_read on public.food_popularity for select to authenticated using(true);
create policy provider_logs_admin_read on public.provider_api_logs for select using(public.has_permission('admin.access'));
create policy provider_cache_admin_read on public.provider_food_cache for select using(public.has_permission('admin.access'));
commit;
