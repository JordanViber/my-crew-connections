alter table public.connections
add column if not exists prefers_profile_name boolean not null default false;