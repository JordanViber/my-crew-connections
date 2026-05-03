create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'general',
  title text not null,
  body text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists in_app_notifications_user_created_idx
on public.in_app_notifications (user_id, created_at desc);

create index if not exists in_app_notifications_user_unread_idx
on public.in_app_notifications (user_id, read_at)
where read_at is null;

alter table public.in_app_notifications enable row level security;

drop policy if exists "in app notifications own rows" on public.in_app_notifications;
create policy "in app notifications own rows"
on public.in_app_notifications
for select
using (auth.uid() = user_id);

drop policy if exists "in app notifications own updates" on public.in_app_notifications;
create policy "in app notifications own updates"
on public.in_app_notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
