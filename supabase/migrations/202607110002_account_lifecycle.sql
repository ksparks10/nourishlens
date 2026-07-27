begin;

alter table public.audit_logs drop constraint audit_logs_actor_id_fkey;
alter table public.audit_logs add constraint audit_logs_actor_id_fkey foreign key(actor_id) references auth.users(id) on delete set null;

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','processing','completed','canceled')),
  requested_at timestamptz not null default now(), completed_at timestamptz,
  unique(user_id,status)
);
alter table public.account_deletion_requests enable row level security;
create policy deletion_requests_own_read on public.account_deletion_requests for select using(user_id=auth.uid() or public.has_permission('users.manage'));
create policy deletion_requests_own_create on public.account_deletion_requests for insert with check(user_id=auth.uid() and status='pending');

create or replace function public.accept_staff_invitation(raw_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invitations%rowtype; current_email text;
begin
  select lower(email) into current_email from auth.users where id=auth.uid();
  if current_email is null then raise exception 'Authentication required'; end if;
  select * into invitation from public.staff_invitations
    where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex') and accepted_at is null and revoked_at is null and expires_at>now()
    for update;
  if invitation.id is null or invitation.email<>current_email then return false; end if;
  insert into public.user_roles(user_id,role_id,assigned_by) values(auth.uid(),invitation.role_id,invitation.invited_by) on conflict do nothing;
  update public.staff_invitations set accepted_by=auth.uid(),accepted_at=now() where id=invitation.id;
  insert into public.audit_logs(actor_id,action,target_type,target_id,reason) values(auth.uid(),'staff_invitation.accept','staff_invitation',invitation.id::text,'Invitation accepted');
  return true;
end $$;
revoke all on function public.accept_staff_invitation(text) from public,anon;
grant execute on function public.accept_staff_invitation(text) to authenticated;

create or replace function public.prevent_owner_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.roles where id=coalesce(old.role_id,new.role_id) and key='owner')
     and current_setting('app.ownership_transfer',true)<>'authorized' then
    raise exception 'Owner role changes require ownership transfer workflow';
  end if;
  return coalesce(new,old);
end $$;

create or replace function public.transfer_ownership(new_owner_id uuid, transfer_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare owner_role_id uuid;
begin
  if length(trim(transfer_reason))<10 then raise exception 'A meaningful reason is required'; end if;
  select id into owner_role_id from public.roles where key='owner';
  if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_id=owner_role_id) then raise exception 'Only the owner may transfer ownership'; end if;
  if new_owner_id=auth.uid() or not exists(select 1 from auth.users where id=new_owner_id) then raise exception 'Invalid new owner'; end if;
  perform set_config('app.ownership_transfer','authorized',true);
  insert into public.user_roles(user_id,role_id,assigned_by) values(new_owner_id,owner_role_id,auth.uid()) on conflict do nothing;
  delete from public.user_roles where user_id=auth.uid() and role_id=owner_role_id;
  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
    values(auth.uid(),'owner.transfer','user',new_owner_id::text,trim(transfer_reason),jsonb_build_object('previous_owner',auth.uid()));
end $$;
revoke all on function public.transfer_ownership(uuid,text) from public,anon;
grant execute on function public.transfer_ownership(uuid,text) to authenticated;

commit;
