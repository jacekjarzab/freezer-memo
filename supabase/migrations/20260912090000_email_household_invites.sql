-- Recipient-bound household invites delivered by the send-household-invite Edge Function.
alter table public.household_invites
  add column if not exists invitee_email text;

create index if not exists household_invites_invitee_email_idx
  on public.household_invites (lower(invitee_email));

create or replace function public.create_household_email_invite(
  target_household_id uuid,
  target_invitee_email text,
  valid_for interval default interval '7 days'
)
returns table (invite_id uuid, invite_token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token uuid := gen_random_uuid();
  normalized_email text := lower(trim(target_invitee_email));
begin
  if not exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'only household owners may invite';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invite email is invalid';
  end if;
  if valid_for <= interval '0 seconds' or valid_for > interval '30 days' then
    raise exception 'invite expiry must be between now and 30 days';
  end if;
  expires_at := now() + valid_for;
  insert into public.household_invites (household_id, token_hash, invitee_email, expires_at, created_by)
  values (
    target_household_id,
    encode(extensions.digest(raw_token::text, 'sha256'), 'hex'),
    normalized_email,
    expires_at,
    auth.uid()
  )
  returning id into invite_id;
  invite_token := raw_token;
  return next;
end;
$$;

grant execute on function public.create_household_email_invite(uuid, text, interval) to authenticated;

create or replace function public.accept_household_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.household_invites;
  authenticated_email text := lower(trim(auth.jwt() ->> 'email'));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  insert into public.profiles (id, email) values (auth.uid(), authenticated_email)
  on conflict (id) do update set email = excluded.email where public.profiles.email is null;
  select * into invite from public.household_invites
  where token_hash = encode(extensions.digest(invite_token::text, 'sha256'), 'hex')
    and revoked_at is null and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invite is invalid, expired, or revoked';
  end if;
  if invite.invitee_email is not null and invite.invitee_email is distinct from authenticated_email then
    raise exception 'invite belongs to a different email';
  end if;
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
