begin;

-- Add the display name used by the header and summary.
alter table public.profiles
add column full_name text;

-- Create missing profiles and update existing profiles.
insert into public.profiles (id, is_guest, full_name)
select
  auth_user.id,
  coalesce(auth_user.is_anonymous, false),
  case
    when coalesce(auth_user.is_anonymous, false) then 'Guest'
    else left(
      coalesce(
        nullif(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
        'User'
      ),
      100
    )
  end
from auth.users as auth_user
on conflict (id) do update
set
  is_guest = excluded.is_guest,
  full_name = excluded.full_name;

alter table public.profiles
alter column full_name set not null;

alter table public.profiles
add constraint profiles_full_name_length
check (char_length(trim(full_name)) between 1 and 100);

-- Replace the anonymous-only trigger with one for every new user.
drop trigger if exists on_auth_user_created_seed_anonymous_guest
on auth.users;

drop function if exists private.handle_new_anonymous_user();

create function private.handle_new_user()
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

  if coalesce(new.is_anonymous, false) then
    perform private.seed_guest_data(new.id);
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user()
from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_user();

-- Users may update only their own name, not their guest status.
grant update (full_name)
on public.profiles
to authenticated;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

commit;