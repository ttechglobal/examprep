-- 20261006_subscriptions.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Paid subscriptions, managed from the admin Students page. Run in the Supabase
-- SQL editor AFTER 20261005_plans.sql and BEFORE deploying the app code that
-- uses it (admin Students page, school slots). Safe to re-run.
--
--   subscriptions            the ledger: one row per plan an admin activated
--                            (after the student paid on WhatsApp). Never
--                            deleted; a mistake is cancelled, so history stays.
--   sync_profile_plan(id)    the ONE place profiles.plan / plan_expires_at are
--                            worked out, from every source of Premium:
--                              active school slot → Premium, no end
--                              else latest subscription end → Premium until
--                                then (a past date reads as "expired": the app
--                                treats it as Free, see lib/plans.js)
--                              else Free
--                            Activating, cancelling and school slot changes all
--                            call it, so one source can't overwrite another.
--   activate_subscription    adds a plan. A renewal before expiry starts when
--                            the current plan ends, so no paid days are lost.
--   cancel_subscription      cancels one (e.g. activated by mistake).
--   admin_students / admin_student_counts
--                            the Students page list and its counts, filtered
--                            by student year, plan, school and search, in SQL so
--                            it stays fast as students grow.
--
-- Student year Y = students who joined in Y (Nigerian time) or had a paid plan
-- running at any point in Y.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Ledger ───────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references public.profiles (id) on delete cascade,
  plan_id       text        not null check (plan_id in ('two_months', 'annual', 'legacy')),
  amount        integer     check (amount >= 0),            -- naira paid; null for legacy
  starts_at     timestamptz not null,
  ends_at       timestamptz not null check (ends_at > starts_at),
  status        text        not null default 'active' check (status in ('active', 'cancelled')),
  note          text,                                        -- payment reference, receipt…
  source        text        not null default 'admin',
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  cancel_reason text
);

create index if not exists subscriptions_student_idx on public.subscriptions (student_id, starts_at desc);
create index if not exists subscriptions_active_end_idx on public.subscriptions (ends_at) where status = 'active';

alter table public.subscriptions enable row level security;

-- Premium set by hand before this ledger existed keeps its history.
insert into public.subscriptions (student_id, plan_id, starts_at, ends_at, source, note)
select p.id, 'legacy', least(coalesce(p.created_at, now()), p.plan_expires_at - interval '1 day'),
       p.plan_expires_at, 'legacy', 'Premium set before subscriptions were recorded'
from public.profiles p
where p.plan = 'premium' and p.plan_expires_at is not null
  and not exists (select 1 from public.subscriptions s where s.student_id = p.id);

-- ── The student's plan, from every source ────────────────────────────────────
create or replace function public.sync_profile_plan(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school boolean;
  v_end    timestamptz;
begin
  select exists (select 1 from public.school_subscriptions
                  where student_id = p_student and status = 'active') into v_school;
  select max(ends_at) into v_end from public.subscriptions
   where student_id = p_student and status = 'active';

  update public.profiles set
    plan            = case when v_school or v_end is not null then 'premium' else 'free' end,
    plan_expires_at = case when v_school then null else v_end end
  where id = p_student;
end
$$;

-- ── Activate (after payment) ─────────────────────────────────────────────────
-- p_months / p_amount come from the app's plan list (lib/plans.js PLANS).
create or replace function public.activate_subscription(
  p_student uuid,
  p_plan_id text,
  p_months  integer,
  p_amount  integer,
  p_note    text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_row   public.subscriptions;
begin
  if p_months is null or p_months < 1 or p_months > 36 then
    raise exception 'months must be between 1 and 36';
  end if;
  -- One activation at a time per student, so two clicks can't both stack.
  perform 1 from public.profiles where id = p_student for update;
  if not found then raise exception 'student not found'; end if;

  select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where student_id = p_student and status = 'active';

  insert into public.subscriptions (student_id, plan_id, amount, starts_at, ends_at, note)
  values (p_student, p_plan_id, p_amount, v_start,
          v_start + make_interval(months => p_months), nullif(trim(p_note), ''))
  returning * into v_row;

  perform public.sync_profile_plan(p_student);
  return v_row;
end
$$;

-- ── Cancel (a mistake, a refund) ─────────────────────────────────────────────
-- Later plans that were queued after this one move up to fill its days.
create or replace function public.cancel_subscription(p_id uuid, p_reason text default null)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   public.subscriptions;
  v_cut   interval;
begin
  select * into v_row from public.subscriptions where id = p_id for update;
  if not found then raise exception 'subscription not found'; end if;
  if v_row.status <> 'active' then return v_row; end if;
  perform 1 from public.profiles where id = v_row.student_id for update;

  -- Days of this plan not yet used: later plans start that much earlier.
  v_cut := v_row.ends_at - greatest(v_row.starts_at, least(now(), v_row.ends_at));
  update public.subscriptions
     set starts_at = starts_at - v_cut, ends_at = ends_at - v_cut
   where student_id = v_row.student_id and status = 'active'
     and id <> v_row.id and starts_at >= v_row.ends_at;

  update public.subscriptions
     set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), '')
   where id = p_id
  returning * into v_row;

  perform public.sync_profile_plan(v_row.student_id);
  return v_row;
end
$$;

-- ── Students page ────────────────────────────────────────────────────────────
-- One row per student with everything the list shows. `state`:
--   trial | free | two_months | annual | legacy | school | expired
create or replace view public.admin_student_rows
with (security_invoker = true) as
select
  p.id, p.full_name, p.username, p.email, p.phone_number, p.created_at,
  coalesce(sc.name, p.school_name, p.student_school_name) as school,
  p.plan, p.plan_expires_at, p.trial_ends_at,
  cur.plan_id as current_plan_id,
  last_sub.ends_at as last_paid_end,
  case
    when p.plan = 'premium' and p.plan_expires_at is null then 'school'
    when p.plan = 'premium' and p.plan_expires_at > now() then coalesce(cur.plan_id, 'legacy')
    when p.trial_ends_at > now() then 'trial'
    when last_sub.ends_at is not null and last_sub.ends_at <= now() then 'expired'
    else 'free'
  end as state
from public.profiles p
left join public.schools sc on sc.id = p.school_id
left join lateral (
  select s.plan_id from public.subscriptions s
   where s.student_id = p.id and s.status = 'active' and s.starts_at <= now() and s.ends_at > now()
   order by s.starts_at desc limit 1
) cur on true
left join lateral (
  select max(s.ends_at) as ends_at from public.subscriptions s
   where s.student_id = p.id and s.status = 'active'
) last_sub on true
where coalesce(p.role, 'student') = 'student';

-- Shared filter: year, school, search. p_year null = every year.
create or replace function public.admin_student_matches(
  r public.admin_student_rows, p_year integer, p_school text, p_search text
)
returns boolean
language sql stable
set search_path = public
as $$
  select
    (p_year is null
      or extract(year from r.created_at at time zone 'Africa/Lagos') = p_year
      or exists (select 1 from public.subscriptions s
                  where s.student_id = r.id and s.status = 'active'
                    and s.starts_at < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Africa/Lagos')
                    and s.ends_at   > make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Africa/Lagos')))
    and (p_school is null or r.school = p_school)
    and (p_search is null or p_search = '' or
         concat_ws(' ', r.full_name, r.username, r.email, r.phone_number, r.school) ilike '%' || p_search || '%')
$$;

-- Filters: all | free (no paid plan now, trial included) | trial | paid |
-- two_months | annual | expiring (paid, ends within 7 days) | expired
create or replace function public.admin_student_filter(r public.admin_student_rows, p_filter text)
returns boolean
language sql stable
set search_path = public
as $$
  select case coalesce(p_filter, 'all')
    when 'all'        then true
    when 'free'       then r.state in ('free', 'trial', 'expired')
    when 'trial'      then r.state = 'trial'
    when 'paid'       then r.state in ('two_months', 'annual', 'legacy', 'school')
    when 'two_months' then r.state = 'two_months'
    when 'annual'     then r.state = 'annual'
    when 'expiring'   then r.state in ('two_months', 'annual', 'legacy') and r.plan_expires_at <= now() + interval '7 days'
    when 'expired'    then r.state = 'expired'
    else false
  end
$$;

create or replace function public.admin_students(
  p_year integer, p_filter text, p_school text, p_search text,
  p_sort text, p_limit integer, p_offset integer
)
returns setof public.admin_student_rows
language sql stable
security definer
set search_path = public
as $$
  select r.* from public.admin_student_rows r
  where public.admin_student_matches(r, p_year, p_school, p_search)
    and public.admin_student_filter(r, p_filter)
  order by
    case when p_sort = 'name'   then lower(coalesce(r.full_name, r.username, '')) end asc,
    case when p_sort = 'expiry' then coalesce(r.plan_expires_at, r.last_paid_end) end asc nulls last,
    case when p_sort = 'oldest' then r.created_at end asc,
    r.created_at desc, r.id
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
$$;

-- Counts for the cards and filter chips, for the same year/school/search.
create or replace function public.admin_student_counts(p_year integer, p_school text, p_search text)
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select jsonb_object_agg(f, (select count(*) from public.admin_student_rows r
                               where public.admin_student_matches(r, p_year, p_school, p_search)
                                 and public.admin_student_filter(r, f)))
  from unnest(array['all', 'free', 'trial', 'paid', 'two_months', 'annual', 'expiring', 'expired']) as f
$$;

-- The school filter's options, and the first year with students.
create or replace function public.admin_student_schools()
returns table (school text, students bigint)
language sql stable
security definer
set search_path = public
as $$
  select r.school, count(*) from public.admin_student_rows r
  where r.school is not null and trim(r.school) <> ''
  group by r.school order by r.school
$$;

create or replace function public.admin_first_student_year()
returns integer
language sql stable
security definer
set search_path = public
as $$
  select extract(year from min(created_at) at time zone 'Africa/Lagos')::int
  from public.profiles where coalesce(role, 'student') = 'student'
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.sync_profile_plan(uuid)',
    'public.activate_subscription(uuid, text, integer, integer, text)',
    'public.cancel_subscription(uuid, text)',
    'public.admin_student_matches(public.admin_student_rows, integer, text, text)',
    'public.admin_student_filter(public.admin_student_rows, text)',
    'public.admin_students(integer, text, text, text, text, integer, integer)',
    'public.admin_student_counts(integer, text, text)',
    'public.admin_student_schools()',
    'public.admin_first_student_year()'
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
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.subscriptions from anon;
    revoke all on public.admin_student_rows from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.subscriptions from authenticated;
    revoke all on public.admin_student_rows from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.subscriptions to service_role;
    grant select on public.admin_student_rows to service_role;
  end if;
end $$;

commit;
