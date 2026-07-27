begin;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.roles (id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, is_system boolean not null default true, created_at timestamptz not null default now());
create table public.permissions (id uuid primary key default gen_random_uuid(), key text not null unique, description text not null, created_at timestamptz not null default now());
create table public.role_permissions (role_id uuid references public.roles on delete cascade, permission_id uuid references public.permissions on delete cascade, primary key(role_id,permission_id));
create table public.user_roles (user_id uuid references auth.users on delete cascade, role_id uuid references public.roles on delete restrict, assigned_by uuid references auth.users, assigned_at timestamptz not null default now(), primary key(user_id,role_id));
create table public.user_permissions (user_id uuid references auth.users on delete cascade, permission_id uuid references public.permissions on delete cascade, granted boolean not null default true, assigned_by uuid references auth.users, assigned_at timestamptz not null default now(), primary key(user_id,permission_id));
create table public.staff_invitations (id uuid primary key default gen_random_uuid(), email text not null, role_id uuid not null references public.roles, token_hash text not null unique, invited_by uuid not null references auth.users, expires_at timestamptz not null, accepted_by uuid references auth.users, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(), check (email=lower(trim(email))));
create unique index one_active_staff_invitation on public.staff_invitations(email) where accepted_at is null and revoked_at is null;
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references auth.users, action text not null, target_type text not null, target_id text, reason text, metadata jsonb not null default '{}', ip_address inet, created_at timestamptz not null default now());

insert into public.roles(key,name) values ('free_user','Free user'),('paid_user','Paid user'),('staff','Staff'),('admin','Admin'),('owner','Owner');
insert into public.permissions(key,description) values
 ('admin.access','Access administration'),('users.manage','Manage users'),('staff.manage','Invite and manage staff'),('permissions.manage','Manage permissions'),('audit.read','Read audit logs'),('nutrition.private.read','Read private nutrition data');
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.key='owner';
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r join public.permissions p on p.key='admin.access' where r.key in ('admin','staff');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create or replace function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id) values(new.id);
 insert into public.user_roles(user_id,role_id) select new.id,id from public.roles where key='free_user';
 return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.on_auth_user_created();

create or replace function public.has_permission(requested_permission text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=auth.uid() and p.key=requested_permission and up.granted)
 or (not exists(select 1 from public.user_permissions up join public.permissions p on p.id=up.permission_id where up.user_id=auth.uid() and p.key=requested_permission and not up.granted)
 and exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id where ur.user_id=auth.uid() and p.key=requested_permission));
$$;
revoke all on function public.has_permission(text) from public; grant execute on function public.has_permission(text) to authenticated;

-- One-time owner bootstrap: invoke from a trusted SQL session. Existing ownership blocks further claims.
create or replace function public.bootstrap_owner(owner_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where r.key='owner') then raise exception 'Owner already exists'; end if;
 if not exists(select 1 from auth.users where id=owner_user_id) then raise exception 'User does not exist'; end if;
 insert into public.user_roles(user_id,role_id,assigned_by) select owner_user_id,id,owner_user_id from public.roles where key='owner';
 insert into public.audit_logs(actor_id,action,target_type,target_id,reason) values(owner_user_id,'owner.bootstrap','user',owner_user_id::text,'Initial deployment bootstrap');
end $$;
revoke all on function public.bootstrap_owner(uuid) from public,anon,authenticated;

create or replace function public.prevent_owner_change() returns trigger language plpgsql security definer set search_path='' as $$
begin if exists(select 1 from public.roles where id=coalesce(old.role_id,new.role_id) and key='owner') then raise exception 'Owner role changes require ownership transfer workflow'; end if; return coalesce(new,old); end $$;
create trigger protect_owner before update or delete on public.user_roles for each row execute function public.prevent_owner_change();

alter table public.profiles enable row level security; alter table public.roles enable row level security; alter table public.permissions enable row level security; alter table public.role_permissions enable row level security; alter table public.user_roles enable row level security; alter table public.user_permissions enable row level security; alter table public.staff_invitations enable row level security; alter table public.audit_logs enable row level security;
create policy profiles_select_self on public.profiles for select using(id=auth.uid() or public.has_permission('users.manage'));
create policy profiles_update_self on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy roles_read on public.roles for select to authenticated using(true);
create policy permissions_read on public.permissions for select to authenticated using(public.has_permission('admin.access'));
create policy own_roles_read on public.user_roles for select using(user_id=auth.uid() or public.has_permission('staff.manage'));
create policy staff_roles_manage on public.user_roles for insert with check(public.has_permission('staff.manage'));
create policy own_permissions_read on public.user_permissions for select using(user_id=auth.uid() or public.has_permission('permissions.manage'));
create policy permissions_manage on public.user_permissions for all using(public.has_permission('permissions.manage')) with check(public.has_permission('permissions.manage'));
create policy invitations_manage on public.staff_invitations for all using(public.has_permission('staff.manage')) with check(public.has_permission('staff.manage'));
create policy audit_read on public.audit_logs for select using(public.has_permission('audit.read'));
-- No browser insert/update/delete policy exists for audit logs.
commit;
