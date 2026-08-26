-- Remove anonymous guest accounts and their related demo data after 24 hours.
-- Foreign keys with ON DELETE CASCADE remove profiles, contacts, tasks,
-- subtasks and task assignments together with each expired auth user.

begin;

create extension if not exists pg_cron;

select cron.schedule(
  'cleanup-expired-anonymous-guests',
  '0 * * * *',
  $$
    delete from auth.users
    where is_anonymous is true
      and created_at < pg_catalog.now() - interval '24 hours';
  $$
);

commit;
