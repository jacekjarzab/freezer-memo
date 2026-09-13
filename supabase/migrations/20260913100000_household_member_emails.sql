create or replace function public.list_household_members(target_household_id uuid)
returns table (user_id uuid, role text, email text)
language sql
security definer
set search_path = public, auth
as $$
  select members.user_id, members.role, coalesce(profiles.email, users.email) as email
  from public.household_members members
  join auth.users users on users.id = members.user_id
  left join public.profiles profiles on profiles.id = members.user_id
  where members.household_id = target_household_id
    and exists (
      select 1 from public.household_members viewer
      where viewer.household_id = target_household_id and viewer.user_id = auth.uid()
    );
$$;

grant execute on function public.list_household_members(uuid) to authenticated;
