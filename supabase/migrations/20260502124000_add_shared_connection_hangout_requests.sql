alter table public.hangouts
  drop constraint if exists hangouts_proposal_state_check;

alter table public.hangouts
  add constraint hangouts_proposal_state_check
  check (proposal_state in ('pending', 'confirmed', 'declined'));

alter table public.hangout_participants
  add column if not exists participant_connection_id uuid references public.connections (id) on delete set null;

create index if not exists hangout_participants_participant_connection_idx
on public.hangout_participants (participant_connection_id);