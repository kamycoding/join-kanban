-- Canonical guest-data templates for Join.
-- Applied after the schema migration on a fresh/local Supabase database.

begin;

-- Keep the seed repeatable and remove obsolete template rows.
delete from private.guest_task_assignees_seed;
delete from private.guest_subtasks_seed;
delete from private.guest_tasks_seed;
delete from private.guest_contacts_seed;

insert into private.guest_contacts_seed (
  id,
  first_name,
  last_name,
  email,
  phone,
  color
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Lukas',
    'Braun',
    'lukasbraun12@gmail.com',
    '0049 221 5458541',
    '#00bee8'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Marie',
    'Richter',
    'marie.richter@example.com',
    '+49 151 00001010',
    '#462f8a'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Lukas',
    'Schneider',
    'lukas.schneider@example.com',
    '+49 151 00001001',
    '#ff4646'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Laura',
    'Wagner',
    'laura.wagner@example.com',
    '+49 151 00001004',
    '#124658'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'Elena',
    'Kasel',
    'elena.kasel@gmail.com',
    '0049 5421 21542',
    '#ff7a00'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'Sophie',
    'Fischer',
    'sophie.fischer@example.com',
    '+49 151 00001006',
    '#0038ff'
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    'Richard',
    'Luksmann',
    'luksmann@luks.de',
    '0049 5421 25421',
    '#fc71ff'
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'Lena',
    'Bauer',
    'lena.bauer@example.com',
    '+49 151 00001008',
    '#ffbb2b'
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'Alex',
    'Martinez',
    'martinez@yahoo.com',
    '0049 6521 5423',
    '#124658'
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'Tim',
    'Neumann',
    'tim.neumann@example.com',
    '+49 151 00001007',
    '#462f8a'
  );

insert into private.guest_tasks_seed (
  id,
  title,
  description,
  due_in_days,
  priority,
  category,
  status,
  position
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Contact Form & Imprint',
    'Create a contact form and imprint page.',
    7,
    'urgent',
    'user_story',
    'todo',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Daily Kochwelt Recipe',
    'Build a recipe recommendation and portion calculator.',
    3,
    'medium',
    'user_story',
    'in_progress',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'HTML Base Template Creation',
    'Create reusable HTML base templates.',
    5,
    'low',
    'technical_task',
    'await_feedback',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'CSS Architecture Planning',
    'Define CSS naming conventions and project structure.',
    10,
    'urgent',
    'technical_task',
    'done',
    0
  );

insert into private.guest_subtasks_seed (
  id,
  task_id,
  title,
  is_completed,
  position
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Create contact form',
    false,
    0
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Add imprint content',
    false,
    1
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'Create recipe card',
    true,
    0
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    'Add portion calculator',
    false,
    1
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000003',
    'Create HTML structure',
    true,
    0
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000003',
    'Validate HTML markup',
    true,
    1
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000004',
    'Define naming convention',
    true,
    0
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000004',
    'Create folder structure',
    true,
    1
  );

insert into private.guest_task_assignees_seed (task_id, contact_id)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000005'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000006'
  );

do $$
begin
  if (select count(*) from private.guest_contacts_seed) <> 10
    or (select count(*) from private.guest_tasks_seed) <> 4
    or (select count(*) from private.guest_subtasks_seed) <> 8
    or (select count(*) from private.guest_task_assignees_seed) <> 12
  then
    raise exception 'Guest seed verification failed';
  end if;
end;
$$;

commit;
