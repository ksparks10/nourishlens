begin;
insert into public.permissions(key,description) values ('billing.manage','Manage subscription and complimentary access'),('promo_codes.manage','Manage promotional access codes') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.key='owner' and p.key in('billing.manage','promo_codes.manage') on conflict do nothing;

create table public.subscription_plans(id uuid primary key default gen_random_uuid(),key text not null unique,name text not null,billing_interval text not null check(billing_interval in('month','year')),stripe_price_id text unique,is_active boolean not null default true,created_at timestamptz not null default now());
create table public.stripe_customers(user_id uuid primary key references auth.users on delete cascade,stripe_customer_id text not null unique,created_at timestamptz not null default now());
create table public.subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,plan_id uuid references public.subscription_plans,stripe_subscription_id text unique,status text not null check(status in('active','trialing','past_due','canceled','incomplete','unpaid','expired')),current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean not null default false,trial_end timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create table public.stripe_events(id text primary key,event_type text not null,payload jsonb not null,processing_status text not null default 'processing' check(processing_status in('processing','processed','failed','ignored')),attempt_count integer not null default 1,last_error text,received_at timestamptz not null default now(),processed_at timestamptz);
create table public.promo_codes(id uuid primary key default gen_random_uuid(),name text not null,code_hash text not null unique,code_hint text not null,is_active boolean not null default true,access_duration_days integer check(access_duration_days>0),redemption_limit integer check(redemption_limit>0),redemption_count integer not null default 0,created_by uuid references auth.users,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create trigger promo_codes_updated before update on public.promo_codes for each row execute function public.set_updated_at();
create table public.promo_code_redemptions(id uuid primary key default gen_random_uuid(),promo_code_id uuid not null references public.promo_codes,user_id uuid not null references auth.users on delete cascade,redeemed_at timestamptz not null default now(),access_expires_at timestamptz,unique(promo_code_id,user_id));
create table public.access_grants(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,grant_type text not null check(grant_type in('complimentary','admin','promo','trial')),source_id uuid,starts_at timestamptz not null default now(),expires_at timestamptz,revoked_at timestamptz,granted_by uuid references auth.users,reason text not null,created_at timestamptz not null default now());
create unique index active_grant_source on public.access_grants(user_id,grant_type,source_id) where revoked_at is null;

insert into public.subscription_plans(id,key,name,billing_interval) values ('a0000000-0000-0000-0000-000000000001','premium_monthly','Premium monthly','month'),('a0000000-0000-0000-0000-000000000002','premium_annual','Premium annual','year');
insert into public.promo_codes(id,name,code_hash,code_hint,is_active,access_duration_days) values ('b0000000-0000-0000-0000-000000000001','Initial complimentary access',encode(extensions.digest('FREEFORME','sha256'),'hex'),'FREE…RME',true,null);

create or replace function public.normalize_promo_code(raw_code text) returns text language sql immutable set search_path='' as $$select upper(trim(raw_code))$$;
create or replace function public.redeem_promo_code(raw_code text) returns table(grant_id uuid,expires_at timestamptz) language plpgsql security definer set search_path='' as $$
declare code public.promo_codes%rowtype;redemption_id uuid;access_grant_id uuid;expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into code from public.promo_codes where code_hash=encode(extensions.digest(public.normalize_promo_code(raw_code),'sha256'),'hex') for update;
 if code.id is null or not code.is_active then raise exception 'Invalid or inactive code';end if;
 if code.redemption_limit is not null and code.redemption_count>=code.redemption_limit then raise exception 'Redemption limit reached';end if;
 if exists(select 1 from public.promo_code_redemptions where promo_code_id=code.id and user_id=auth.uid()) then raise exception 'Code already redeemed';end if;
 expiry:=case when code.access_duration_days is null then null else now()+make_interval(days=>code.access_duration_days) end;
 insert into public.promo_code_redemptions(promo_code_id,user_id,access_expires_at) values(code.id,auth.uid(),expiry) returning id into redemption_id;
 update public.promo_codes set redemption_count=redemption_count+1 where id=code.id;
 insert into public.access_grants(user_id,grant_type,source_id,expires_at,reason) values(auth.uid(),'promo',redemption_id,expiry,'Promotional access redemption') returning id into access_grant_id;
 insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'promo.redeem','promo_code',code.id::text,'User redeemed promotional access',jsonb_build_object('redemption_id',redemption_id));
 return query select access_grant_id,expiry;
end $$;
revoke all on function public.redeem_promo_code(text) from public,anon;grant execute on function public.redeem_promo_code(text) to authenticated;

create or replace function public.has_premium_access(check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.subscriptions s where s.user_id=check_user_id and s.status in('active','trialing') and(s.current_period_end is null or s.current_period_end>now()))
 or exists(select 1 from public.access_grants g where g.user_id=check_user_id and g.revoked_at is null and g.starts_at<=now() and(g.expires_at is null or g.expires_at>now()))
 or exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=check_user_id and r.key='owner');
$$;
revoke all on function public.has_premium_access(uuid) from public,anon;grant execute on function public.has_premium_access(uuid) to authenticated;

alter table public.subscription_plans enable row level security;alter table public.stripe_customers enable row level security;alter table public.subscriptions enable row level security;alter table public.stripe_events enable row level security;alter table public.promo_codes enable row level security;alter table public.promo_code_redemptions enable row level security;alter table public.access_grants enable row level security;
create policy plans_read on public.subscription_plans for select to authenticated using(is_active or public.has_permission('billing.manage'));
create policy customers_own_read on public.stripe_customers for select using(user_id=auth.uid() or public.has_permission('billing.manage'));
create policy subscriptions_own_read on public.subscriptions for select using(user_id=auth.uid() or public.has_permission('billing.manage'));
create policy stripe_events_admin_read on public.stripe_events for select using(public.has_permission('billing.manage'));
create policy promo_codes_admin_all on public.promo_codes for all using(public.has_permission('promo_codes.manage')) with check(public.has_permission('promo_codes.manage'));
create policy redemptions_own_read on public.promo_code_redemptions for select using(user_id=auth.uid() or public.has_permission('promo_codes.manage'));
create policy grants_own_read on public.access_grants for select using(user_id=auth.uid() or public.has_permission('billing.manage'));
create policy grants_admin_manage on public.access_grants for all using(public.has_permission('billing.manage')) with check(public.has_permission('billing.manage'));
-- Browser clients cannot write customers, subscriptions, or Stripe events. Webhooks use the server-only service role.
commit;
