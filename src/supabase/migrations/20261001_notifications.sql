-- 20261001_notifications.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Push notifications: the device table, saving a device, and the three daily
-- reminder jobs. Run AFTER 20260930 and BEFORE deploying the app code that goes
-- with it (/api/push/subscribe calls save_push_subscription). Safe to re-run.
--
-- BEFORE running, store two Vault secrets (SQL editor, once — see PUSH_AND_KEYS.md):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<sb_secret_… key>',                 'notifications_secret_key');
-- This file stops with a clear error if either is missing.
--
-- 1. push_subscriptions was created by hand; this records it here. On live it
--    already exists, so its column TYPES are checked (standards §4.8), not just
--    assumed from "create table if not exists".
-- 2. One row per push address. The device id lives in the phone's localStorage;
--    clearing it gave the same browser a new device id and a second row, so it
--    got every notification twice. save_push_subscription() keeps one row per
--    push address (endpoint) and one per device id, in one transaction.
-- 3. Reminder jobs at 12:00, 16:00 and 20:00 Lagos time (11/15/19 UTC). They
--    read the project URL and secret key from Vault when they run, so no key is
--    ever stored in a job's command, and send the key in the `apikey` header as
--    Supabase secret keys require. The six hand-made jobs they replace all failed
--    (placeholder URLs, a missing setting, a missing "Bearer"); they and their run
--    history (which held a plain-text copy of the legacy key) are deleted here.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Device table ─────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  device_id    text        not null unique,
  user_id      uuid        references auth.users (id) on delete set null,
  subscription jsonb       not null,
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The table may predate this file: check what's there, don't assume.
do $$
declare
  v_expected constant jsonb := '{"id":"uuid","device_id":"text","user_id":"uuid","subscription":"jsonb",
                                 "active":"boolean","created_at":"timestamp with time zone",
                                 "updated_at":"timestamp with time zone"}';
  v_col  text;
  v_type text;
begin
  for v_col, v_type in select key, value from jsonb_each_text(v_expected) loop
    if (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = 'push_subscriptions' and column_name = v_col)
       is distinct from v_type then
      raise exception 'push_subscriptions.% must be % (found %). Fix the column before running this migration.',
        v_col, v_type,
        coalesce((select data_type from information_schema.columns
                  where table_schema = 'public' and table_name = 'push_subscriptions' and column_name = v_col), 'no column');
    end if;
  end loop;
  if not exists (select 1 from pg_index i
                 join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
                 where i.indrelid = 'public.push_subscriptions'::regclass and i.indisunique
                   and i.indnatts = 1 and a.attname = 'device_id') then
    raise exception 'push_subscriptions.device_id must be unique (save_push_subscription relies on it)';
  end if;
end
$$;

-- Server-only table: RLS on, no policies.
alter table public.push_subscriptions enable row level security;

-- One row per push address: remove older duplicates, then enforce it.
delete from public.push_subscriptions p
using public.push_subscriptions newer
where p.subscription ->> 'endpoint' = newer.subscription ->> 'endpoint'
  and (p.updated_at, p.id) < (newer.updated_at, newer.id);

create unique index if not exists push_subscriptions_endpoint_key
  on public.push_subscriptions ((subscription ->> 'endpoint'));
create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (id) where active;

-- ── 2. Saving a device ──────────────────────────────────────────────────────
-- Called by /api/push/subscribe (service role) with an already-validated
-- subscription. Idempotent: saving the same device again only refreshes it.
create or replace function public.save_push_subscription(
  p_device_id    text,
  p_subscription jsonb,
  p_user_id      uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The same browser under an older device id (localStorage was cleared).
  delete from public.push_subscriptions
  where subscription ->> 'endpoint' = p_subscription ->> 'endpoint'
    and device_id <> p_device_id;

  insert into public.push_subscriptions (device_id, user_id, subscription, active, updated_at)
  values (p_device_id, p_user_id, p_subscription, true, now())
  on conflict (device_id) do update
    set user_id      = excluded.user_id,
        subscription = excluded.subscription,
        active       = true,
        updated_at   = now();
end
$$;

revoke execute on function public.save_push_subscription(text, jsonb, uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.save_push_subscription(text, jsonb, uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.save_push_subscription(text, jsonb, uuid) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_push_subscription(text, jsonb, uuid) to service_role;
  end if;
end $$;

-- ── 3. Reminder jobs ────────────────────────────────────────────────────────
do $$
declare
  v_missing text[];
  v_url     text;
  v_slot    record;
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise exception 'pg_cron is not enabled (Database → Extensions → pg_cron)';
  end if;
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    raise exception 'pg_net is not enabled (Database → Extensions → pg_net)';
  end if;
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault is not available (Database → Extensions → supabase_vault)';
  end if;

  select array_agg(n) into v_missing
  from unnest(array['project_url', 'notifications_secret_key']) n
  where not exists (select 1 from vault.decrypted_secrets s where s.name = n and coalesce(s.decrypted_secret, '') <> '');
  if v_missing is not null then
    raise exception 'Vault secret(s) missing: %. Create them first (see the header of this file).', array_to_string(v_missing, ', ');
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  if v_url !~ '^https://[a-z0-9-]+\.supabase\.co/?$' then
    raise exception 'Vault secret project_url must look like https://<project-ref>.supabase.co (no path)';
  end if;
  if (select decrypted_secret from vault.decrypted_secrets where name = 'notifications_secret_key') not like 'sb_secret_%' then
    raise exception 'Vault secret notifications_secret_key must be a secret key (sb_secret_…), not a legacy JWT';
  end if;

  -- Remove every job that calls the function (including the six old hand-made
  -- ones), and their run history: pg_cron keeps each run's command text, and one
  -- old job had the legacy service-role key written into it. Then add three.
  if to_regclass('cron.job_run_details') is not null then
    delete from cron.job_run_details
    where jobid in (select jobid from cron.job where command ilike '%send-notifications%');
  end if;
  perform cron.unschedule(jobid) from cron.job where command ilike '%send-notifications%';

  for v_slot in select * from (values ('noon', '0 11 * * *'), ('afternoon', '0 15 * * *'), ('evening', '0 19 * * *')) s(slot, at) loop
    perform cron.schedule('push-reminder-' || v_slot.slot, v_slot.at, format($job$
      select net.http_post(
        url     := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'project_url'), '/')
                   || '/functions/v1/send-notifications',
        body    := jsonb_build_object('slot', %L),
        params  := '{}'::jsonb,
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'notifications_secret_key')),
        timeout_milliseconds := 10000
      )$job$, v_slot.slot));
  end loop;
end
$$;

commit;

-- Check: three jobs, 11:00 / 15:00 / 19:00 UTC (12pm / 4pm / 8pm in Lagos).
select jobname, schedule, active from cron.job where jobname like 'push-reminder-%' order by schedule;
