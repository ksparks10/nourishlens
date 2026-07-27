begin;
insert into public.food_sources(key,name,base_url) values
('nih_dsld','NIH Dietary Supplement Label Database','https://api.ods.od.nih.gov/dsld/v9'),
('health_canada_cnf','Health Canada Canadian Nutrient File','https://food-nutrition.canada.ca/api/canadian-nutrient-file')
on conflict(key) do update set name=excluded.name,base_url=excluded.base_url;
commit;
