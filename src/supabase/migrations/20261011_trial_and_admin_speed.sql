-- 20261011_trial_and_admin_speed.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The free trial is 14 days (was 7) for every NEW account.
-- 2. The admin Students list counts in one pass instead of eight.
-- 3. Who a notification can be sent to: everyone, one student, or a group
--    (exam, plan, inactive for N days, plan ending soon).
-- Run in the Supabase SQL editor AFTER 20261010_xp_and_notifications.sql and
-- BEFORE deploying the app code and the send-notifications function. Safe to
-- re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Trial: 14 days ────────────────────────────────────────────────────────
-- New accounts get their trial from this column default, whichever way the
-- profile row is created. It must match TRIAL_DAYS in src/lib/plans.js.
-- Accounts that already exist keep the trial they have.
alter table public.profiles
  alter column trial_ends_at set default (now() + interval '14 days');

-- OPTIONAL, not run: give students whose 7-day trial is still running the full
-- 14 days from the day they joined. Review, then run by hand if you want it.
--   update public.profiles
--      set trial_ends_at = created_at + interval '14 days'
--    where trial_ends_at > now()
--      and trial_ends_at < created_at + interval '14 days';

-- ── 2. Admin Students: one pass for all the counts ───────────────────────────
-- Same result as before (it still uses admin_student_filter for every filter,
-- so the cards and the list can never disagree), but one scan of the students
-- instead of eight.
create or replace function public.admin_student_counts(p_year integer, p_school text, p_search text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'all',        count(*),
    'free',       count(*) filter (where public.admin_student_filter(r, 'free')),
    'trial',      count(*) filter (where public.admin_student_filter(r, 'trial')),
    'paid',       count(*) filter (where public.admin_student_filter(r, 'paid')),
    'two_months', count(*) filter (where public.admin_student_filter(r, 'two_months')),
    'annual',     count(*) filter (where public.admin_student_filter(r, 'annual')),
    'expiring',   count(*) filter (where public.admin_student_filter(r, 'expiring')),
    'expired',    count(*) filter (where public.admin_student_filter(r, 'expired'))
  )
  from public.admin_student_rows r
  where public.admin_student_matches(r, p_year, p_school, p_search)
$$;

-- The view looks up each student's current and last plan: this makes both quick.
create index if not exists subscriptions_student_status_idx
  on public.subscriptions (student_id, status, ends_at desc);

-- ── 3. Notification audiences ────────────────────────────────────────────────
-- kind / value:
--   all                      every device, including visitors with no account
--   user      <student id>   one student's devices
--   exam      WAEC | JAMB    students sitting that exam
--   plan      free | trial | paid
--   inactive  <days>         students who haven't practised for that many days
--   expiring                 paid students whose plan ends within 7 days
-- Only active devices count. Returns one row per device.
create or replace function public.notification_audience(p_kind text, p_value text)
returns table (sub_id uuid, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select ps.id, ps.user_id
  from public.push_subscriptions ps
  left join public.profiles p on p.id = ps.user_id
  left join public.admin_student_rows r on r.id = ps.user_id
  where ps.active
    and case coalesce(p_kind, 'all')
      when 'all'      then true
      when 'user'     then ps.user_id = p_value::uuid
      when 'exam'     then (to_jsonb(p) -> 'exam_types') ? p_value or (to_jsonb(p) ->> 'exam_type') = p_value
      when 'plan'     then case p_value
                             when 'free'  then r.state in ('free', 'expired')
                             when 'trial' then r.state = 'trial'
                             when 'paid'  then r.state in ('two_months', 'annual', 'legacy', 'school')
                             else false end
      when 'inactive' then p.id is not null
                           and coalesce(p.last_active_date, (p.created_at at time zone 'Africa/Lagos')::date)
                               < public.app_today() - greatest(p_value::integer, 1)
      when 'expiring' then r.state in ('two_months', 'annual', 'legacy')
                           and r.plan_expires_at > now() and r.plan_expires_at <= now() + interval '7 days'
      else false
    end
$$;

-- How many devices and students a send would reach.
create or replace function public.notification_audience_count(p_kind text, p_value text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('devices', count(*), 'students', count(distinct a.user_id))
  from public.notification_audience(p_kind, p_value) a
$$;

-- One page of devices to send to: the push subscription and the student's first
-- name (for "{name}" in a message). Paged in SQL so a big audience isn't cut at
-- Supabase's 1,000-row response limit.
create or replace function public.notification_targets(p_kind text, p_value text, p_offset integer, p_limit integer)
returns table (id uuid, subscription jsonb, user_id uuid, first_name text)
language sql
stable
security definer
set search_path = public
as $$
  select ps.id, ps.subscription, a.user_id,
         nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '')
  from public.notification_audience(p_kind, p_value) a
  join public.push_subscriptions ps on ps.id = a.sub_id
  left join public.profiles p on p.id = a.user_id
  order by ps.id
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 1000)
$$;

-- Server-only.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_student_counts(integer, text, text)',
    'public.notification_audience(text, text)',
    'public.notification_audience_count(text, text)',
    'public.notification_targets(text, text, integer, integer)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

commit;
