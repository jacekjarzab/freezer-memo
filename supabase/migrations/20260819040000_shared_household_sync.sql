-- Shared Household Sync: membership-scoped inventory with idempotent mutations.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  owner_id uuid not null references public.profiles(id),
  next_revision bigint not null default 0 check (next_revision >= 0),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create unique index household_members_one_household_per_user_idx
  on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((accepted_by is null) = (accepted_at is null))
);

create table public.freezer_items (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  status text not null check (status in ('in_freezer', 'taken_out')),
  category_key text not null,
  cut_key text not null,
  freezer_key text not null check (freezer_key in ('home', 'basement', 'away')),
  quantity_type text not null check (quantity_type in ('weight', 'packs', 'pieces')),
  quantity_value numeric not null check (quantity_value > 0),
  quantity_unit text not null,
  notes text not null default '',
  frozen_at timestamptz not null,
  taken_out_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_revision bigint not null check (server_revision > 0),
  check ((status = 'in_freezer' and taken_out_at is null) or status = 'taken_out')
);
create index freezer_items_household_revision_idx
  on public.freezer_items (household_id, server_revision);

-- Records accepted mutation IDs to make retries safe after a dropped response.
create table public.inventory_mutations (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  item_id uuid not null,
  applied_revision bigint not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.freezer_items enable row level security;
alter table public.inventory_mutations enable row level security;

-- SECURITY DEFINER avoids recursive RLS policy evaluation; it is only a membership predicate.
create function public.is_active_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid()
  );
$$;

create policy "members can read their household" on public.households
  for select using (public.is_active_household_member(id));
create policy "members can read their household membership" on public.household_members
  for select using (public.is_active_household_member(household_id));
create policy "members can read household inventory" on public.freezer_items
  for select using (public.is_active_household_member(household_id));
create policy "members can read their mutations" on public.inventory_mutations
  for select using (public.is_active_household_member(household_id));
create policy "owners can read household invites" on public.household_invites
  for select using (
    exists (
      select 1 from public.household_members
      where household_id = public.household_invites.household_id
        and user_id = auth.uid() and role = 'owner'
    )
  );
create policy "users can read their own profile" on public.profiles
  for select using (id = auth.uid());

-- No direct insert/update/delete policies are deliberately provided for inventory or membership.
-- The RPCs below allocate revisions, enforce ownership, and make sync retries idempotent.

create function public.create_household(household_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  created_household public.households;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'an account may belong to only one household';
  end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.households (name, owner_id)
  values (household_name, auth.uid())
  returning * into created_household;
  insert into public.household_members (household_id, user_id, role)
  values (created_household.id, auth.uid(), 'owner');
  return created_household;
end;
$$;

create function public.revoke_household_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.household_invites invite
  set revoked_at = now()
  where invite.id = target_invite_id
    and revoked_at is null
    and accepted_at is null
    and exists (
      select 1 from public.household_members
      where household_id = invite.household_id and user_id = auth.uid() and role = 'owner'
    );
  if not found then raise exception 'invite not found or not owned by caller'; end if;
end;
$$;

create function public.remove_household_member(target_household_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if target_user_id = auth.uid() then raise exception 'owners cannot remove themselves'; end if;
  if not exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'only household owners may remove members'; end if;
  delete from public.household_members
  where household_id = target_household_id and user_id = target_user_id and role = 'member';
  if not found then raise exception 'member not found or cannot be removed'; end if;
end;
$$;

create function public.create_household_invite(target_household_id uuid, valid_for interval default interval '7 days')
returns table (invite_id uuid, invite_token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token uuid := gen_random_uuid();
begin
  if not exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'only household owners may invite'; end if;
  if valid_for <= interval '0 seconds' or valid_for > interval '30 days' then
    raise exception 'invite expiry must be between now and 30 days';
  end if;
  expires_at := now() + valid_for;
  insert into public.household_invites (household_id, token_hash, expires_at, created_by)
  values (target_household_id, encode(extensions.digest(raw_token::text, 'sha256'), 'hex'), expires_at, auth.uid());
  invite_id := (select id from public.household_invites where token_hash = encode(extensions.digest(raw_token::text, 'sha256'), 'hex'));
  invite_token := raw_token;
  return next;
end;
$$;

create function public.accept_household_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.household_invites;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  select * into invite from public.household_invites
  where token_hash = encode(extensions.digest(invite_token::text, 'sha256'), 'hex')
    and revoked_at is null and accepted_at is null and expires_at > now()
  for update;
  if not found then raise exception 'invite is invalid, expired, or revoked'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'an account may belong to only one household';
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (invite.household_id, auth.uid(), 'member');
  update public.household_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite.id;
  return invite.household_id;
end;
$$;

create function public.apply_freezer_mutation(
  target_household_id uuid,
  mutation_id uuid,
  mutation_kind text,
  item jsonb
)
returns public.freezer_items
language plpgsql
security definer
set search_path = public
as $$
declare
  revision bigint;
  existing_mutation public.inventory_mutations;
  saved_item public.freezer_items;
begin
  if mutation_kind not in ('upsert_item', 'delete_item') then raise exception 'invalid mutation kind'; end if;
  if not public.is_active_household_member(target_household_id) then raise exception 'household membership required'; end if;
  select * into existing_mutation from public.inventory_mutations where id = mutation_id;
  if found then
    if existing_mutation.household_id <> target_household_id then raise exception 'mutation belongs to another household'; end if;
    select * into saved_item from public.freezer_items
    where household_id = target_household_id and id = existing_mutation.item_id;
    return saved_item;
  end if;
  if item is null or not (item ? 'id') then raise exception 'item payload with id required'; end if;
  update public.households set next_revision = next_revision + 1
  where id = target_household_id returning next_revision into revision;
  if not found then raise exception 'household not found'; end if;
  insert into public.freezer_items (
    id, household_id, status, category_key, cut_key, freezer_key, quantity_type,
    quantity_value, quantity_unit, notes, frozen_at, taken_out_at, created_at,
    updated_at, deleted_at, server_revision
  ) values (
    (item->>'id')::uuid, target_household_id,
    case when mutation_kind = 'delete_item' then 'taken_out' else item->>'status' end,
    coalesce(item->>'categoryKey', ''), coalesce(item->>'cutKey', ''),
    coalesce(item->>'freezerKey', 'home'), coalesce(item->>'quantityType', 'pieces'),
    coalesce((item->>'quantityValue')::numeric, 1), coalesce(item->>'quantityUnit', ''),
    coalesce(item->>'notes', ''), coalesce((item->>'frozenAt')::timestamptz, now()),
    nullif(item->>'takenOutAt', '')::timestamptz,
    coalesce((item->>'createdAt')::timestamptz, now()), now(),
    case when mutation_kind = 'delete_item' then now() else nullif(item->>'deletedAt', '')::timestamptz end,
    revision
  ) on conflict (id) do update set
    status = excluded.status, category_key = excluded.category_key, cut_key = excluded.cut_key,
    freezer_key = excluded.freezer_key, quantity_type = excluded.quantity_type,
    quantity_value = excluded.quantity_value, quantity_unit = excluded.quantity_unit,
    notes = excluded.notes, frozen_at = excluded.frozen_at, taken_out_at = excluded.taken_out_at,
    updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
    server_revision = excluded.server_revision
  where public.freezer_items.household_id = target_household_id
  returning * into saved_item;
  if not found then raise exception 'item belongs to another household'; end if;
  insert into public.inventory_mutations (id, household_id, item_id, applied_revision)
  values (mutation_id, target_household_id, saved_item.id, revision);
  return saved_item;
end;
$$;

revoke all on function public.is_active_household_member(uuid) from public;
grant select on public.profiles, public.households, public.household_members,
  public.household_invites, public.freezer_items, public.inventory_mutations to authenticated;
grant execute on function public.is_active_household_member(uuid), public.create_household(text),
  public.create_household_invite(uuid, interval), public.revoke_household_invite(uuid),
  public.remove_household_member(uuid, uuid),
  public.accept_household_invite(uuid), public.apply_freezer_mutation(uuid, uuid, text, jsonb) to authenticated;
