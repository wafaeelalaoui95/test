-- Actually enforce the five-year retention period.
--
-- 2026-09-03-deleted-account-records.sql gave every row a purge_after date and
-- left it at that, which is not a retention policy — it is a note. A period
-- nobody enforces is a hoard with a comment on it, and the whole justification
-- for keeping the data ("necessary, for a limited time") depends on the limit
-- being real.
--
-- pg_cron runs inside the database, so this survives without any deploy,
-- scheduler or reminder. Enable the extension first:
--   Supabase → Database → Extensions → search "pg_cron" → enable
-- (or the create extension below, if your role may).

create extension if not exists pg_cron;

-- Nightly at 03:00 UTC. Deleting a handful of rows costs nothing, and running
-- daily means a row never outlives its period by more than a day.
select cron.unschedule('purge-deleted-account-records')
where exists (
  select 1 from cron.job where jobname = 'purge-deleted-account-records'
);

select cron.schedule(
  'purge-deleted-account-records',
  '0 3 * * *',
  $$delete from public.deleted_account_records where purge_after < now()$$
);

-- Check it is registered:
--   select jobid, jobname, schedule, active from cron.job;
--
-- And that it runs (after the first night):
--   select jobid, status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'purge-deleted-account-records')
--   order by start_time desc limit 5;

-- ---------------------------------------------------------------------------
-- If pg_cron is not available
-- ---------------------------------------------------------------------------
-- Run this by hand, and put a yearly reminder somewhere you will actually see:
--
--   delete from public.deleted_account_records where purge_after < now();
