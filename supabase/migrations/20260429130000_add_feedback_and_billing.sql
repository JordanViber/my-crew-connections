alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists stripe_cancel_at_period_end boolean not null default false;

create unique index if not exists profiles_stripe_customer_id_unique
on public.profiles (stripe_customer_id)
where stripe_customer_id is not null;

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'general' check (category in ('general', 'bug', 'billing', 'idea')),
  message text not null check (char_length(trim(message)) > 0 and char_length(message) <= 2000),
  page_path text,
  user_email text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_feedback_user_created_idx
on public.app_feedback (user_id, created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "feedback own inserts" on public.app_feedback;
create policy "feedback own inserts"
on public.app_feedback
for insert
with check (auth.uid() = user_id);

drop policy if exists "feedback own rows" on public.app_feedback;
create policy "feedback own rows"
on public.app_feedback
for select
using (auth.uid() = user_id);
