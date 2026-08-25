-- Move a task and normalize the positions in the affected board columns atomically.

begin;

create function public.move_task(
  p_task_id uuid,
  p_status text,
  p_position integer
)
returns setof public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  previous_status text;
  target_position integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('todo', 'in_progress', 'await_feedback', 'done') then
    raise exception 'Invalid task status';
  end if;

  if p_position is null or p_position < 0 then
    raise exception 'Task position must be a non-negative integer';
  end if;

  -- Serialize moves belonging to the same user and lock their task rows.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  perform tasks.id
  from public.tasks as tasks
  where tasks.owner_id = current_user_id
  for update;

  select tasks.status
  into previous_status
  from public.tasks as tasks
  where tasks.id = p_task_id
    and tasks.owner_id = current_user_id;

  if previous_status is null then
    raise exception 'Task not found';
  end if;

  select least(
    p_position,
    count(*)::integer
  )
  into target_position
  from public.tasks as tasks
  where tasks.owner_id = current_user_id
    and tasks.status = p_status
    and tasks.id <> p_task_id;

  -- Rank the existing target-column tasks without the moved task, create a gap
  -- at the requested position and place the moved task into that gap.
  with ranked_target as (
    select
      tasks.id,
      (pg_catalog.row_number() over (
        order by tasks.position, tasks.created_at, tasks.id
      ) - 1)::integer as old_position
    from public.tasks as tasks
    where tasks.owner_id = current_user_id
      and tasks.status = p_status
      and tasks.id <> p_task_id
  ),
  desired_target as (
    select
      ranked_target.id,
      case
        when ranked_target.old_position >= target_position
          then ranked_target.old_position + 1
        else ranked_target.old_position
      end as position
    from ranked_target

    union all

    select p_task_id, target_position
  )
  update public.tasks as tasks
  set
    status = p_status,
    position = desired_target.position
  from desired_target
  where tasks.id = desired_target.id
    and tasks.owner_id = current_user_id;

  -- When changing columns, close the gap left in the previous column.
  if previous_status <> p_status then
    with ranked_previous as (
      select
        tasks.id,
        (pg_catalog.row_number() over (
          order by tasks.position, tasks.created_at, tasks.id
        ) - 1)::integer as position
      from public.tasks as tasks
      where tasks.owner_id = current_user_id
        and tasks.status = previous_status
    )
    update public.tasks as tasks
    set position = ranked_previous.position
    from ranked_previous
    where tasks.id = ranked_previous.id
      and tasks.owner_id = current_user_id;
  end if;

  return query
  select tasks.*
  from public.tasks as tasks
  where tasks.owner_id = current_user_id
    and tasks.status in (previous_status, p_status)
  order by tasks.status, tasks.position, tasks.created_at, tasks.id;
end;
$$;

revoke all on function public.move_task(uuid, text, integer)
from public, anon, authenticated;

grant execute on function public.move_task(uuid, text, integer)
to authenticated;

commit;
