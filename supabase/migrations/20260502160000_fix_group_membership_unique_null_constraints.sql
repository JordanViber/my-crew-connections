alter table public.group_memberships
  drop constraint if exists group_memberships_group_user_unique;

alter table public.group_memberships
  drop constraint if exists group_memberships_group_connection_unique;

alter table public.group_memberships
  add constraint group_memberships_group_user_unique unique (group_id, user_id);

alter table public.group_memberships
  add constraint group_memberships_group_connection_unique unique (group_id, connection_id);
