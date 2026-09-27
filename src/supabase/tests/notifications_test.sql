-- supabase/tests/notifications_test.sql
-- Checks for 20261001_notifications.sql. LOCAL POSTGRES ONLY.
-- Setup: local_supabase_shims.sql, local_notification_shims.sql, then run this.
-- It runs the migration itself (several times, on purpose).
-- Expect the last line: ALL NOTIFICATION TESTS PASSED
\set ON_ERROR_STOP 0
\set QUIET 1
\set mig '../migrations/20261001_notifications.sql'

-- ── 1. refuses to run without the Vault secrets ─────────────────────────────
delete from vault.decrypted_secrets; delete from cron.job; delete from net.sent;
drop table if exists public.push_subscriptions cascade;
insert into cron.job (jobname, schedule, command) values
  ('push-noon', '0 11 * * *', 'select net.http_post(url := ''https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notifications'')'),
  ('pvp-sweep', '*/5 * * * *', 'select public.pvp_sweep()');
delete from cron.job_run_details;
insert into cron.job_run_details (jobid, command, status) select jobid, command, 'succeeded' from cron.job;
\echo '--- expect: Vault secret(s) missing'
\i :mig
do $$ begin
  assert (select count(*) from cron.job where jobname = 'push-noon') = 1, 'a failed run changes nothing (old job still there)';
end $$;

-- ── 2. refuses a legacy JWT as the key ──────────────────────────────────────
insert into vault.decrypted_secrets values
  ('project_url', 'https://abcdefghijklmnop.supabase.co'),
  ('notifications_secret_key', 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig');
\echo '--- expect: must be a secret key (sb_secret_…)'
\i :mig

-- ── 3. runs, twice ──────────────────────────────────────────────────────────
update vault.decrypted_secrets set decrypted_secret = 'sb_secret_TESTKEY123' where name = 'notifications_secret_key';
\set ON_ERROR_STOP 1
\i :mig
\i :mig
do $$ begin
  assert (select count(*) from cron.job where command ilike '%send-notifications%') = 3, 'exactly three reminder jobs';
  assert (select string_agg(schedule, ',' order by schedule) from cron.job where jobname like 'push-reminder-%')
         = '0 11 * * *,0 15 * * *,0 19 * * *', 'at 11/15/19 UTC';
  assert not exists (select 1 from cron.job where jobname = 'push-noon'), 'old broken job removed';
  assert exists (select 1 from cron.job where jobname = 'pvp-sweep'), 'unrelated jobs untouched';
  assert not exists (select 1 from cron.job where command like '%sb_secret_TESTKEY123%'), 'no key stored in any job';
  assert not exists (select 1 from cron.job_run_details where command ilike '%YOUR_PROJECT_REF%'), 'old jobs'' run history removed';
  assert exists (select 1 from cron.job_run_details where command = 'select public.pvp_sweep()'), 'other jobs'' history kept';
end $$;

-- ── 4. what a job actually sends ────────────────────────────────────────────
do $$ declare c text; begin
  select command into c from cron.job where jobname = 'push-reminder-afternoon';
  execute c;
end $$;
do $$ declare s net.sent; begin
  select * into s from net.sent order by id desc limit 1;
  assert s.url = 'https://abcdefghijklmnop.supabase.co/functions/v1/send-notifications', 'url: ' || s.url;
  assert s.headers ->> 'apikey' = 'sb_secret_TESTKEY123', 'key sent in apikey header';
  assert not (s.headers ? 'Authorization'), 'no Authorization header';
  assert s.body = '{"slot": "afternoon"}'::jsonb, 'body: ' || s.body::text;
end $$;
-- a trailing slash in project_url is tolerated
update vault.decrypted_secrets set decrypted_secret = 'https://abcdefghijklmnop.supabase.co/' where name = 'project_url';
do $$ declare c text; begin select command into c from cron.job where jobname = 'push-reminder-noon'; execute c; end $$;
do $$ begin
  assert (select url from net.sent order by id desc limit 1) = 'https://abcdefghijklmnop.supabase.co/functions/v1/send-notifications', 'trailing slash';
end $$;

-- ── 5. saving devices ───────────────────────────────────────────────────────
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b')
on conflict do nothing;
do $$ begin
  perform save_push_subscription('dev-1', '{"endpoint":"https://push.example/A","keys":{"p256dh":"x","auth":"y"}}', null);
  perform save_push_subscription('dev-1', '{"endpoint":"https://push.example/A","keys":{"p256dh":"x","auth":"y"}}', '00000000-0000-0000-0000-00000000000a');
  assert (select count(*) from push_subscriptions) = 1, 'same device saved twice = one row';
  assert (select user_id from push_subscriptions where device_id = 'dev-1') = '00000000-0000-0000-0000-00000000000a', 'signing in attaches the user';

  -- localStorage cleared: same browser (same endpoint), new device id
  perform save_push_subscription('dev-2', '{"endpoint":"https://push.example/A","keys":{"p256dh":"x","auth":"y"}}', '00000000-0000-0000-0000-00000000000a');
  assert (select count(*) from push_subscriptions) = 1, 'same push address never stored twice';
  assert (select device_id from push_subscriptions) = 'dev-2', 'the newest device id wins';

  -- the browser renewed its subscription: new endpoint, same device
  update push_subscriptions set active = false;
  perform save_push_subscription('dev-2', '{"endpoint":"https://push.example/B","keys":{"p256dh":"x","auth":"y"}}', null);
  assert (select subscription ->> 'endpoint' from push_subscriptions where device_id = 'dev-2') = 'https://push.example/B', 'renewed address stored';
  assert (select active from push_subscriptions where device_id = 'dev-2'), 'saving re-activates a device';

  perform save_push_subscription('dev-3', '{"endpoint":"https://push.example/C","keys":{"p256dh":"x","auth":"y"}}', '00000000-0000-0000-0000-00000000000b');
  assert (select count(*) from push_subscriptions) = 2, 'a second phone is its own row';
end $$;

-- players can't call it or read the table directly
set role authenticated;
do $$ begin
  begin perform save_push_subscription('x', '{"endpoint":"e"}', null); assert false, 'players cannot save directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── 6. duplicates already in the table are cleaned up on the next run ───────
alter table push_subscriptions drop constraint if exists push_subscriptions_device_id_key;
drop index if exists push_subscriptions_endpoint_key;
alter table push_subscriptions add constraint push_subscriptions_device_id_key unique (device_id);
insert into push_subscriptions (device_id, subscription, updated_at) values
  ('old-dup', '{"endpoint":"https://push.example/C"}', now() - interval '1 day');
\i :mig
do $$ begin
  assert not exists (select 1 from push_subscriptions where device_id = 'old-dup'), 'older duplicate removed';
  assert exists (select 1 from push_subscriptions where device_id = 'dev-3'), 'newer copy kept';
end $$;

-- ── 7. a wrong column type is caught, not silently kept ─────────────────────
\set ON_ERROR_STOP 0
drop table push_subscriptions cascade;
create table push_subscriptions (id uuid primary key default gen_random_uuid(), device_id uuid not null unique,
  user_id uuid, subscription jsonb not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
\echo '--- expect: push_subscriptions.device_id must be text (found uuid)'
\i :mig
\set ON_ERROR_STOP 1
drop table push_subscriptions cascade;
\i :mig

select 'ALL NOTIFICATION TESTS PASSED' as result;
