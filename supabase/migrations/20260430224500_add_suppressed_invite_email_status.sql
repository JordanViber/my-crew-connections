alter table public.connection_invites
drop constraint if exists connection_invites_email_delivery_status_check;

alter table public.connection_invites
add constraint connection_invites_email_delivery_status_check
check (email_delivery_status in ('pending', 'sent', 'failed', 'not_configured', 'suppressed'));

alter table public.group_invites
drop constraint if exists group_invites_email_delivery_status_check;

alter table public.group_invites
add constraint group_invites_email_delivery_status_check
check (email_delivery_status in ('pending', 'sent', 'failed', 'not_configured', 'suppressed'));