-- Give every anonymous Supabase user an isolated copy of the guest demo data.

begin;

create function private.seed_guest_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'A target user is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_user_id::text, 0)
  );

  delete from public.tasks where owner_id = target_user_id;
  delete from public.contacts where owner_id = target_user_id;

  insert into public.contacts (
    id,
    owner_id,
    first_name,
    last_name,
    email,
    phone,
    color
  )
  select
    pg_catalog.gen_random_uuid(),
    target_user_id,
    seed.first_name,
    seed.last_name,
    seed.email,
    seed.phone,
    seed.color
  from private.guest_contacts_seed as seed;

  insert into public.tasks (
    id,
    owner_id,
    title,
    description,
    due_date,
    priority,
    category,
    status,
    position
  )
  select
    pg_catalog.gen_random_uuid(),
    target_user_id,
    seed.title,
    seed.description,
    current_date + seed.due_in_days,
    seed.priority,
    seed.category,
    seed.status,
    seed.position
  from private.guest_tasks_seed as seed;

  insert into public.subtasks (
    id,
    task_id,
    title,
    is_completed,
    position
  )
  select
    pg_catalog.gen_random_uuid(),
    task.id,
    subtask_seed.title,
    subtask_seed.is_completed,
    subtask_seed.position
  from private.guest_subtasks_seed as subtask_seed
  join private.guest_tasks_seed as task_seed
    on task_seed.id = subtask_seed.task_id
  join public.tasks as task
    on task.owner_id = target_user_id
    and task.title = task_seed.title;

  insert into public.task_assignees (task_id, contact_id)
  select
    task.id,
    contact.id
  from private.guest_task_assignees_seed as assignment_seed
  join private.guest_tasks_seed as task_seed
    on task_seed.id = assignment_seed.task_id
  join public.tasks as task
    on task.owner_id = target_user_id
    and task.title = task_seed.title
  join private.guest_contacts_seed as contact_seed
    on contact_seed.id = assignment_seed.contact_id
  join public.contacts as contact
    on contact.owner_id = target_user_id
    and lower(trim(contact.email)) = lower(trim(contact_seed.email));
end;
$$;

revoke all on function private.seed_guest_data(uuid)
from public, anon, authenticated;

create function private.handle_new_anonymous_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous is not true then
    return new;
  end if;

  insert into public.profiles (id, is_guest)
  values (new.id, true)
  on conflict (id) do update set is_guest = true;

  perform private.seed_guest_data(new.id);

  return new;
end;
$$;

revoke all on function private.handle_new_anonymous_user()
from public, anon, authenticated;

create trigger on_auth_user_created_seed_anonymous_guest
after insert on auth.users
for each row execute function private.handle_new_anonymous_user();

create or replace function public.reset_guest_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_user_id uuid := auth.uid();
begin
  if guest_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where profiles.id = guest_user_id
      and profiles.is_guest = true
  ) then
    raise exception 'Only a guest may reset guest data';
  end if;

  perform private.seed_guest_data(guest_user_id);
end;
$$;

revoke all on function public.reset_guest_data()
from public, anon, authenticated;

grant execute on function public.reset_guest_data()
to authenticated;

commit;
