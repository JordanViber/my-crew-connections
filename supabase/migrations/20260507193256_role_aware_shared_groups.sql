create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create index if not exists group_memberships_active_user_group_idx
on public.group_memberships (user_id, group_id, role)
where user_id is not null
  and removed_at is null;

create index if not exists hangouts_group_target_start_idx
on public.hangouts (target_id, starts_at asc)
where target_type = 'group';

create index if not exists touchpoints_group_target_occurred_idx
on public.touchpoints (target_id, occurred_at desc)
where target_type = 'group';

create or replace function private.is_active_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where groups.id = target_group_id
      and groups.owner_user_id = (select auth.uid())
      and groups.archived_at is null
  )
  or exists (
    select 1
    from public.group_memberships
    join public.groups on groups.id = group_memberships.group_id
    where group_memberships.group_id = target_group_id
      and group_memberships.user_id = (select auth.uid())
      and group_memberships.removed_at is null
      and groups.archived_at is null
  );
$$;

create or replace function private.can_manage_group_plans(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where groups.id = target_group_id
      and groups.owner_user_id = (select auth.uid())
      and groups.archived_at is null
  )
  or exists (
    select 1
    from public.group_memberships
    join public.groups on groups.id = group_memberships.group_id
    where group_memberships.group_id = target_group_id
      and group_memberships.user_id = (select auth.uid())
      and group_memberships.role in ('owner', 'organizer')
      and group_memberships.removed_at is null
      and groups.archived_at is null
  );
$$;

revoke all on function private.is_active_group_member(uuid) from public;
revoke all on function private.can_manage_group_plans(uuid) from public;
grant execute on function private.is_active_group_member(uuid) to authenticated;
grant execute on function private.can_manage_group_plans(uuid) to authenticated;

drop policy if exists "groups shared select" on public.groups;
create policy "groups shared select"
on public.groups
for select
to authenticated
using (private.is_active_group_member(id));

drop policy if exists "group memberships shared select" on public.group_memberships;
create policy "group memberships shared select"
on public.group_memberships
for select
to authenticated
using (private.is_active_group_member(group_id));

drop policy if exists "touchpoints shared group select" on public.touchpoints;
create policy "touchpoints shared group select"
on public.touchpoints
for select
to authenticated
using (
  target_type = 'group'
  and private.is_active_group_member(target_id)
);

drop policy if exists "touchpoints shared group insert" on public.touchpoints;
create policy "touchpoints shared group insert"
on public.touchpoints
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and target_type = 'group'
  and private.is_active_group_member(target_id)
);

drop policy if exists "hangouts shared group select" on public.hangouts;
create policy "hangouts shared group select"
on public.hangouts
for select
to authenticated
using (
  target_type = 'group'
  and private.is_active_group_member(target_id)
);

drop policy if exists "hangouts shared group insert" on public.hangouts;
create policy "hangouts shared group insert"
on public.hangouts
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and target_type = 'group'
  and private.is_active_group_member(target_id)
);

drop policy if exists "hangouts shared group manager update" on public.hangouts;
create policy "hangouts shared group manager update"
on public.hangouts
for update
to authenticated
using (
  target_type = 'group'
  and private.can_manage_group_plans(target_id)
)
with check (
  target_type = 'group'
  and private.can_manage_group_plans(target_id)
);

drop policy if exists "hangout participants shared group select" on public.hangout_participants;
create policy "hangout participants shared group select"
on public.hangout_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.target_type = 'group'
      and private.is_active_group_member(hangouts.target_id)
  )
);
