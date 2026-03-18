create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  linked_user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) > 0),
  tags text[] not null default '{}',
  preferred_activities text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  connection_id uuid references public.connections (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'organizer', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  constraint group_memberships_actor_check check (
    (user_id is not null and connection_id is null)
    or (user_id is null and connection_id is not null)
  ),
  constraint group_memberships_group_user_unique unique nulls not distinct (group_id, user_id),
  constraint group_memberships_group_connection_unique unique nulls not distinct (group_id, connection_id)
);

create table if not exists public.cadence_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('connection', 'group')),
  target_id uuid not null,
  cadence_unit text not null check (cadence_unit in ('days', 'weeks', 'months')),
  cadence_value integer not null check (cadence_value > 0),
  reminder_lead_days integer not null default 3 check (reminder_lead_days >= 0),
  snoozed_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cadence_rules_owner_target_unique unique (owner_user_id, target_type, target_id)
);

create table if not exists public.touchpoints (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('connection', 'group')),
  target_id uuid not null,
  touchpoint_type text not null default 'hangout' check (touchpoint_type in ('check-in', 'message', 'call', 'hangout')),
  occurred_at timestamptz not null,
  note text,
  activity_label text,
  location_label text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists connections_owner_idx on public.connections (owner_user_id) where archived_at is null;
create index if not exists groups_owner_idx on public.groups (owner_user_id) where archived_at is null;
create index if not exists cadence_rules_owner_target_idx on public.cadence_rules (owner_user_id, target_type, target_id);
create index if not exists touchpoints_owner_target_idx on public.touchpoints (owner_user_id, target_type, target_id, occurred_at desc);
create index if not exists group_memberships_group_idx on public.group_memberships (group_id) where removed_at is null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists connections_set_updated_at on public.connections;
create trigger connections_set_updated_at
before update on public.connections
for each row
execute function public.set_updated_at();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row
execute function public.set_updated_at();

drop trigger if exists cadence_rules_set_updated_at on public.cadence_rules;
create trigger cadence_rules_set_updated_at
before update on public.cadence_rules
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.cadence_rules enable row level security;
alter table public.touchpoints enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "connections own rows" on public.connections;
create policy "connections own rows"
on public.connections
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "groups own rows" on public.groups;
create policy "groups own rows"
on public.groups
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "group memberships through owned groups" on public.group_memberships;
create policy "group memberships through owned groups"
on public.group_memberships
for all
using (
  exists (
    select 1
    from public.groups
    where groups.id = group_memberships.group_id
      and groups.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.groups
    where groups.id = group_memberships.group_id
      and groups.owner_user_id = auth.uid()
  )
);

drop policy if exists "cadence rules own rows" on public.cadence_rules;
create policy "cadence rules own rows"
on public.cadence_rules
for all
using (auth.uid() = owner_user_id)
with check (
  auth.uid() = owner_user_id
  and (
    (target_type = 'connection' and exists (
      select 1
      from public.connections
      where connections.id = cadence_rules.target_id
        and connections.owner_user_id = auth.uid()
    ))
    or
    (target_type = 'group' and exists (
      select 1
      from public.groups
      where groups.id = cadence_rules.target_id
        and groups.owner_user_id = auth.uid()
    ))
  )
);

drop policy if exists "touchpoints own rows" on public.touchpoints;
create policy "touchpoints own rows"
on public.touchpoints
for all
using (auth.uid() = owner_user_id)
with check (
  auth.uid() = owner_user_id
  and (
    (target_type = 'connection' and exists (
      select 1
      from public.connections
      where connections.id = touchpoints.target_id
        and connections.owner_user_id = auth.uid()
    ))
    or
    (target_type = 'group' and exists (
      select 1
      from public.groups
      where groups.id = touchpoints.target_id
        and groups.owner_user_id = auth.uid()
    ))
  )
);