create index if not exists connection_invites_incoming_idx
on public.connection_invites (invited_email, created_at desc)
where revoked_at is null and claimed_at is null;

create index if not exists profiles_phone_number_idx
on public.profiles (phone_number)
where phone_number is not null and phone_number <> '';
