alter table public.hangouts
  add column if not exists proposal_state text not null default 'confirmed' check (proposal_state in ('pending', 'confirmed')),
  add column if not exists proposal_confirmed_at timestamptz,
  add column if not exists photo_album_label text,
  add column if not exists photo_album_url text;

update public.hangouts
set proposal_confirmed_at = coalesce(proposal_confirmed_at, created_at)
where proposal_state = 'confirmed'
  and proposal_confirmed_at is null;

alter table public.touchpoints
  add column if not exists photo_album_label text,
  add column if not exists photo_album_url text;

create table if not exists public.hangout_participants (
  id uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references public.hangouts (id) on delete cascade,
  connection_id uuid references public.connections (id) on delete set null,
  participant_user_id uuid not null references auth.users (id) on delete cascade,
  response_status text not null default 'pending' check (response_status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint hangout_participants_hangout_user_unique unique (hangout_id, participant_user_id),
  constraint hangout_participants_hangout_connection_unique unique nulls not distinct (hangout_id, connection_id)
);

create index if not exists hangout_participants_hangout_idx
on public.hangout_participants (hangout_id);

create index if not exists hangout_participants_user_idx
on public.hangout_participants (participant_user_id, response_status);

alter table public.hangout_participants enable row level security;

drop policy if exists "hangout participants select" on public.hangout_participants;
create policy "hangout participants select"
on public.hangout_participants
for select
using (
  auth.uid() = participant_user_id
  or exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.owner_user_id = auth.uid()
  )
);

drop policy if exists "hangout participants insert" on public.hangout_participants;
create policy "hangout participants insert"
on public.hangout_participants
for insert
with check (
  exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.owner_user_id = auth.uid()
  )
);

drop policy if exists "hangout participants update" on public.hangout_participants;
create policy "hangout participants update"
on public.hangout_participants
for update
using (
  auth.uid() = participant_user_id
  or exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.owner_user_id = auth.uid()
  )
)
with check (
  auth.uid() = participant_user_id
  or exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.owner_user_id = auth.uid()
  )
);

drop policy if exists "hangout participants delete" on public.hangout_participants;
create policy "hangout participants delete"
on public.hangout_participants
for delete
using (
  exists (
    select 1
    from public.hangouts
    where hangouts.id = hangout_participants.hangout_id
      and hangouts.owner_user_id = auth.uid()
  )
);