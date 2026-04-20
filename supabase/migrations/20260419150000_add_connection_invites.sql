create table if not exists public.connection_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  invited_email text not null,
  token text not null unique,
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists connection_invites_owner_idx
on public.connection_invites (owner_user_id, connection_id, created_at desc);

create index if not exists connection_invites_token_idx
on public.connection_invites (token)
where revoked_at is null and claimed_at is null;

alter table public.connection_invites enable row level security;

drop policy if exists "connection invites own rows" on public.connection_invites;
create policy "connection invites own rows"
on public.connection_invites
for all
using (auth.uid() = owner_user_id)
with check (
  auth.uid() = owner_user_id
  and exists (
    select 1
    from public.connections
    where connections.id = connection_invites.connection_id
      and connections.owner_user_id = auth.uid()
  )
);
