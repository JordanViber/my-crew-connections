alter table public.hangouts
  add column if not exists place_name text,
  add column if not exists place_address text,
  add column if not exists google_place_id text,
  add column if not exists google_maps_url text,
  add column if not exists yelp_business_id text,
  add column if not exists yelp_url text,
  add column if not exists opentable_url text;
