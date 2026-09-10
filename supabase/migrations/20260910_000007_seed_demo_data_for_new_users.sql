-- Give every newly created user an isolated, editable copy of the demo data.
-- Existing users are intentionally left unchanged.

begin;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name :=
    case
      when coalesce(new.is_anonymous, false) then 'Guest'
      else left(
        coalesce(
          nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
          nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
          'User'
        ),
        100
      )
    end;

  insert into public.profiles (id, is_guest, full_name)
  values (
    new.id,
    coalesce(new.is_anonymous, false),
    profile_name
  )
  on conflict (id) do update
  set
    is_guest = excluded.is_guest,
    full_name = excluded.full_name;

  perform private.seed_guest_data(new.id);

  return new;
end;
$$;

revoke all on function private.handle_new_user()
from public, anon, authenticated;

commit;
