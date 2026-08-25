-- Allow a household owner to revoke a member's shared-inventory access.
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

grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
