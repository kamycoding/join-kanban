-- Create a task, its subtasks and its contact assignments atomically.

begin;

create function public.create_task_with_details(
  p_title text,
  p_description text,
  p_due_date date,
  p_priority text,
  p_category text,
  p_status text default 'todo',
  p_position integer default 0,
  p_subtasks jsonb default '[]'::jsonb,
  p_contact_ids uuid[] default '{}'::uuid[]
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_task public.tasks;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if pg_catalog.jsonb_typeof(coalesce(p_subtasks, '[]'::jsonb)) <> 'array' then
    raise exception 'Subtasks must be a JSON array';
  end if;

  insert into public.tasks (
    owner_id,
    title,
    description,
    due_date,
    priority,
    category,
    status,
    position
  )
  values (
    current_user_id,
    p_title,
    p_description,
    p_due_date,
    p_priority,
    p_category,
    p_status,
    p_position
  )
  returning * into created_task;

  insert into public.subtasks (
    task_id,
    title,
    is_completed,
    position
  )
  select
    created_task.id,
    subtask.value ->> 'title',
    coalesce((subtask.value ->> 'is_completed')::boolean, false),
    coalesce((subtask.value ->> 'position')::integer, (subtask.ordinality - 1)::integer)
  from pg_catalog.jsonb_array_elements(coalesce(p_subtasks, '[]'::jsonb))
    with ordinality as subtask(value, ordinality);

  insert into public.task_assignees (task_id, contact_id)
  select
    created_task.id,
    contact_ids.contact_id
  from pg_catalog.unnest(coalesce(p_contact_ids, '{}'::uuid[]))
    as contact_ids(contact_id)
  where contact_ids.contact_id is not null
  group by contact_ids.contact_id;

  return created_task;
end;
$$;

revoke all on function public.create_task_with_details(
  text,
  text,
  date,
  text,
  text,
  text,
  integer,
  jsonb,
  uuid[]
)
from public, anon, authenticated;

grant execute on function public.create_task_with_details(
  text,
  text,
  date,
  text,
  text,
  text,
  integer,
  jsonb,
  uuid[]
)
to authenticated;

commit;
