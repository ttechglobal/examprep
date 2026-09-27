-- supabase/tests/local_notification_shims.sql
-- Stand-ins for pg_cron, pg_net, Supabase Vault and auth.users so
-- 20261001_notifications.sql can be tested in a plain local Postgres.
-- NEVER run this on Supabase.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid());

create schema if not exists cron;
create table if not exists cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text, active boolean default true);
create table if not exists cron.job_run_details (runid bigserial primary key, jobid bigint, command text, status text);
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid $$;
create or replace function cron.unschedule(job_id bigint) returns boolean language sql as $$
  delete from cron.job where jobid = job_id returning true $$;

create schema if not exists net;
create table if not exists net.sent (id bigserial primary key, url text, body jsonb, headers jsonb, timeout_ms integer);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
                                         headers jsonb default '{"Content-Type":"application/json"}', timeout_milliseconds integer default 5000)
returns bigint language sql as $$
  insert into net.sent (url, body, headers, timeout_ms) values (url, body, headers, timeout_milliseconds) returning id $$;

create schema if not exists vault;
create table if not exists vault.decrypted_secrets (name text primary key, decrypted_secret text);
