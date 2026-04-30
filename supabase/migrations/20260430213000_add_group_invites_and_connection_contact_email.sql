alter table public.connections
add column if not exists contact_email text;

update public.connections as connection
set contact_email = lower(trim(latest_invite.invited_email))
from (
  select distinct on (connection_id)
    connection_id,
    invited_email
  from public.connection_invites
  where invited_email is not null
  order by connection_id, created_at desc
) as latest_invite
where connection.id = latest_invite.connection_id
  and connection.contact_email is null;

update public.connections as connection
set contact_email = lower(trim(auth_user.email))
from auth.users as auth_user
where connection.linked_user_id = auth_user.id
  and auth_user.email is not null
  and connection.contact_email is null;

with ranked_contact_emails as (
  select
    id,
    row_number() over (
      partition by owner_user_id, lower(contact_email)
      order by (linked_user_id is not null) desc, updated_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.connections
  where archived_at is null
    and contact_email is not null
)
update public.connections as connection
set contact_email = null
from ranked_contact_emails
where connection.id = ranked_contact_emails.id
  and ranked_contact_emails.duplicate_rank > 1;

create unique index if not exists connections_owner_contact_email_unique_idx
on public.connections (owner_user_id, lower(contact_email))
where archived_at is null and contact_email is not null;

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  invited_email text not null,
  token text not null unique,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  declined_by_user_id uuid references auth.users (id) on delete set null,
  declined_at timestamptz,
  revoked_at timestamptz,
  email_provider text,
  email_message_id text,
  email_delivery_status text not null default 'pending',
  email_error_message text,
  email_last_attempted_at timestamptz,
  email_sent_at timestamptz,
  email_updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint group_invites_email_delivery_status_check
    check (email_delivery_status in ('pending', 'sent', 'failed', 'not_configured'))
);

create index if not exists group_invites_owner_group_idx
on public.group_invites (owner_user_id, group_id, created_at desc);

create index if not exists group_invites_invited_email_idx
on public.group_invites (invited_email, created_at desc)
where accepted_at is null and declined_at is null and revoked_at is null;

create index if not exists group_invites_token_idx
on public.group_invites (token)
where accepted_at is null and declined_at is null and revoked_at is null;

create index if not exists group_invites_email_message_id_idx
on public.group_invites (email_provider, email_message_id)
where email_message_id is not null;

create unique index if not exists group_invites_group_connection_active_idx
on public.group_invites (group_id, connection_id)
where accepted_at is null and declined_at is null and revoked_at is null;

alter table public.group_invites enable row level security;

drop policy if exists "group invites own rows" on public.group_invites;
create policy "group invites own rows"
on public.group_invites
for all
using (auth.uid() = owner_user_id)
with check (
  auth.uid() = owner_user_id
  and exists (
    select 1
    from public.groups
    where groups.id = group_invites.group_id
      and groups.owner_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.connections
    where connections.id = group_invites.connection_id
      and connections.owner_user_id = auth.uid()
  )
);