alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone_number text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_city text,
  add column if not exists billing_region text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text;

update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(trim(display_name), ' ', 1), '')),
  last_name = coalesce(last_name, nullif(trim(regexp_replace(trim(display_name), '^\S+\s*', '')), '')),
  display_name = coalesce(
    nullif(trim(display_name), ''),
    nullif(trim(concat_ws(' ', first_name, last_name)), '')
  )
where
  first_name is null
  or last_name is null
  or display_name is null
  or trim(display_name) = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    first_name,
    last_name,
    phone_number,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_region,
    billing_postal_code,
    billing_country
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_address_line1'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_address_line2'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_city'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_region'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_postal_code'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'billing_country'), '')
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone_number = excluded.phone_number,
    billing_address_line1 = excluded.billing_address_line1,
    billing_address_line2 = excluded.billing_address_line2,
    billing_city = excluded.billing_city,
    billing_region = excluded.billing_region,
    billing_postal_code = excluded.billing_postal_code,
    billing_country = excluded.billing_country,
    updated_at = timezone('utc', now());

  return new;
end;
$$;