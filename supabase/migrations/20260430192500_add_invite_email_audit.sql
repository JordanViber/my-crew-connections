alter table public.connection_invites
add column if not exists email_provider text,
add column if not exists email_message_id text,
add column if not exists email_delivery_status text not null default 'pending',
add column if not exists email_error_message text,
add column if not exists email_last_attempted_at timestamptz,
add column if not exists email_sent_at timestamptz,
add column if not exists email_updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'connection_invites_email_delivery_status_check'
      and conrelid = 'public.connection_invites'::regclass
  ) then
    alter table public.connection_invites
    add constraint connection_invites_email_delivery_status_check
    check (email_delivery_status in ('pending', 'sent', 'failed', 'not_configured'));
  end if;
end $$;

create index if not exists connection_invites_email_message_id_idx
on public.connection_invites (email_provider, email_message_id)
where email_message_id is not null;
