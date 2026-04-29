create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists push_subscriptions_user_enabled_idx
on public.push_subscriptions (user_id, enabled);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions own rows" on public.push_subscriptions;
create policy "push subscriptions own rows"
on public.push_subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notification_deliveries_user_key_unique unique (user_id, notification_key)
);

create index if not exists notification_deliveries_user_created_idx
on public.notification_deliveries (user_id, created_at desc);

alter table public.notification_deliveries enable row level security;

drop policy if exists "notification deliveries own rows" on public.notification_deliveries;
create policy "notification deliveries own rows"
on public.notification_deliveries
for select
using (auth.uid() = user_id);
