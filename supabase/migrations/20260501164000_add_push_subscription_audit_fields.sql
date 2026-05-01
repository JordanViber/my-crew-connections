alter table public.push_subscriptions
  add column if not exists device_family text,
  add column if not exists browser_name text,
  add column if not exists install_state text,
  add column if not exists permission_state text,
  add column if not exists last_subscription_status text,
  add column if not exists last_subscription_error text,
  add column if not exists last_subscribed_at timestamptz,
  add column if not exists last_delivery_status text,
  add column if not exists last_delivery_error text,
  add column if not exists last_delivery_source text,
  add column if not exists last_delivery_at timestamptz;

create index if not exists push_subscriptions_user_last_seen_idx
on public.push_subscriptions (user_id, last_seen_at desc);