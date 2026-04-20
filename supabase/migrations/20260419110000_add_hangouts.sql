create table if not exists public.hangouts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('connection', 'group')),
  target_id uuid not null,
  title text not null check (char_length(trim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  location text,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'completed', 'canceled')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hangouts_owner_status_start_idx
on public.hangouts (owner_user_id, status, starts_at asc);

create index if not exists hangouts_owner_target_idx
on public.hangouts (owner_user_id, target_type, target_id, starts_at asc);

drop trigger if exists hangouts_set_updated_at on public.hangouts;
create trigger hangouts_set_updated_at
before update on public.hangouts
for each row
execute function public.set_updated_at();

alter table public.hangouts enable row level security;

drop policy if exists "hangouts own rows" on public.hangouts;
create policy "hangouts own rows"
on public.hangouts
for all
using (auth.uid() = owner_user_id)
with check (
  auth.uid() = owner_user_id
  and (
    (target_type = 'connection' and exists (
      select 1
      from public.connections
      where connections.id = hangouts.target_id
        and connections.owner_user_id = auth.uid()
    ))
    or
    (target_type = 'group' and exists (
      select 1
      from public.groups
      where groups.id = hangouts.target_id
        and groups.owner_user_id = auth.uid()
    ))
  )
);
