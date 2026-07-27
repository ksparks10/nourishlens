begin;

alter table public.recipes
  add column if not exists source_url text,
  add column if not exists source_platform text,
  add column if not exists source_caption text,
  add column if not exists imported_ingredients jsonb not null default '[]'::jsonb,
  add column if not exists import_status text;

alter table public.recipes
  add constraint recipes_source_platform_check
  check (source_platform is null or source_platform in ('instagram'));

alter table public.recipes
  add constraint recipes_imported_ingredients_array_check
  check (jsonb_typeof(imported_ingredients) = 'array');

alter table public.recipes
  add constraint recipes_import_status_check
  check (import_status is null or import_status in ('imported_text', 'matched'));

commit;
