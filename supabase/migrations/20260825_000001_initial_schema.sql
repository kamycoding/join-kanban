-- Initial Supabase schema baseline for Join.
-- This schema already exists in the hosted project; do not run it there twice.

begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text not null,
  color text not null,
  updated_at timestamptz not null default now(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  constraint contacts_email_not_blank
    check (char_length(trim(email)) between 1 and 254),
  constraint contacts_phone_not_blank
    check (char_length(trim(phone)) between 1 and 32),
  constraint contacts_color_format
    check (color ~ '^#[0-9a-fA-F]{6}$')
);

create index contacts_owner_id_idx on public.contacts(owner_id);
create unique index contacts_owner_email_unique_idx
  on public.contacts(owner_id, lower(trim(email)));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  title text not null
    check (char_length(trim(title)) between 1 and 100),
  description text not null default '',
  due_date date not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'urgent')),
  category text not null
    check (category in ('user_story', 'technical_task')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'await_feedback', 'done')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_owner_status_position_idx
  on public.tasks(owner_id, status, position);
create index tasks_owner_due_date_idx
  on public.tasks(owner_id, due_date);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null
    check (char_length(trim(title)) between 1 and 100),
  is_completed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index subtasks_task_position_idx
  on public.subtasks(task_id, position);

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, contact_id)
);

create index task_assignees_contact_id_idx
  on public.task_assignees(contact_id);

-- Private templates used to restore the shared guest account.

create table private.guest_contacts_seed (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  color text not null
);

create table private.guest_tasks_seed (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text not null default '',
  due_in_days integer not null,
  priority text not null
    check (priority in ('low', 'medium', 'urgent')),
  category text not null
    check (category in ('user_story', 'technical_task')),
  status text not null
    check (status in ('todo', 'in_progress', 'await_feedback', 'done')),
  position integer not null default 0 check (position >= 0)
);

create table private.guest_subtasks_seed (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null
    references private.guest_tasks_seed(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  position integer not null default 0
);

create table private.guest_task_assignees_seed (
  task_id uuid not null
    references private.guest_tasks_seed(id) on delete cascade,
  contact_id uuid not null
    references private.guest_contacts_seed(id) on delete cascade,
  primary key (task_id, contact_id)
);

revoke all
on table
  private.guest_contacts_seed,
  private.guest_tasks_seed,
  private.guest_subtasks_seed,
  private.guest_task_assignees_seed
from public, anon, authenticated;

-- Keep updated_at authoritative in PostgreSQL.

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at()
from public, anon, authenticated;

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

-- Data API grants and Row Level Security.

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_assignees enable row level security;

revoke all
on table
  public.profiles,
  public.contacts,
  public.tasks,
  public.subtasks,
  public.task_assignees
from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete
  on table public.contacts, public.tasks, public.subtasks
  to authenticated;
grant select, insert, delete
  on table public.task_assignees
  to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "contacts_select_own"
on public.contacts for select to authenticated
using (owner_id = (select auth.uid()));

create policy "contacts_insert_own"
on public.contacts for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "contacts_update_own"
on public.contacts for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "contacts_delete_own"
on public.contacts for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "tasks_select_own"
on public.tasks for select to authenticated
using (owner_id = (select auth.uid()));

create policy "tasks_insert_own"
on public.tasks for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "tasks_update_own"
on public.tasks for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "tasks_delete_own"
on public.tasks for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "subtasks_select_own"
on public.subtasks for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.owner_id = (select auth.uid())
  )
);

create policy "subtasks_insert_own"
on public.subtasks for insert to authenticated
with check (
  exists (
    select 1 from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.owner_id = (select auth.uid())
  )
);

create policy "subtasks_update_own"
on public.subtasks for update to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.owner_id = (select auth.uid())
  )
);

create policy "subtasks_delete_own"
on public.subtasks for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.owner_id = (select auth.uid())
  )
);

create policy "task_assignees_select_own"
on public.task_assignees for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_assignees.task_id
      and tasks.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.contacts
    where contacts.id = task_assignees.contact_id
      and contacts.owner_id = (select auth.uid())
  )
);

create policy "task_assignees_insert_own"
on public.task_assignees for insert to authenticated
with check (
  exists (
    select 1 from public.tasks
    where tasks.id = task_assignees.task_id
      and tasks.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.contacts
    where contacts.id = task_assignees.contact_id
      and contacts.owner_id = (select auth.uid())
  )
);

create policy "task_assignees_delete_own"
on public.task_assignees for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_assignees.task_id
      and tasks.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.contacts
    where contacts.id = task_assignees.contact_id
      and contacts.owner_id = (select auth.uid())
  )
);

-- Restore the guest account from the protected templates.

create function public.reset_guest_data()
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
    raise exception 'Only the guest account may reset guest data';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(guest_user_id::text, 0)
  );

  delete from public.tasks where owner_id = guest_user_id;
  delete from public.contacts where owner_id = guest_user_id;

  insert into public.contacts (
    id, owner_id, first_name, last_name, email, phone, color
  )
  select
    seed.id,
    guest_user_id,
    seed.first_name,
    seed.last_name,
    seed.email,
    seed.phone,
    seed.color
  from private.guest_contacts_seed as seed;

  insert into public.tasks (
    id, owner_id, title, description, due_date,
    priority, category, status, position
  )
  select
    seed.id,
    guest_user_id,
    seed.title,
    seed.description,
    current_date + seed.due_in_days,
    seed.priority,
    seed.category,
    seed.status,
    seed.position
  from private.guest_tasks_seed as seed;

  insert into public.subtasks (
    id, task_id, title, is_completed, position
  )
  select
    seed.id,
    seed.task_id,
    seed.title,
    seed.is_completed,
    seed.position
  from private.guest_subtasks_seed as seed;

  insert into public.task_assignees (task_id, contact_id)
  select seed.task_id, seed.contact_id
  from private.guest_task_assignees_seed as seed;
end;
$$;

revoke all on function public.reset_guest_data()
from public, anon, authenticated;

grant execute on function public.reset_guest_data()
to authenticated;

commit;
