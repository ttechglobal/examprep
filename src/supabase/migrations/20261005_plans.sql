-- 20261005_plans.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Free and Premium plans. Run in the Supabase SQL editor AFTER
-- 20261004_battle_xp.sql, on launch day: every account that exists when it
-- runs gets a 7-day Premium trial starting then. Safe to re-run (a re-run
-- does not restart anyone's trial).
--
-- The rules (what Free can do) live in the app, in src/lib/plans.js. The
-- database only stores who has Premium until when, and counts daily uses.
--
--   profiles.plan / plan_expires_at   paid or school Premium (existing columns;
--                                     plan = 'premium', no expiry = no end)
--   profiles.trial_ends_at            the 7-day trial. New accounts get it
--                                     from the column default, whichever way
--                                     the profile row is created.
--   feature_usage                     one row per counted use of a daily-
--                                     limited feature (Free plan only)
--   use_feature(...)                  atomic check-and-count for one use
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Trial ────────────────────────────────────────────────────────────────────
-- Adding the column with a default fills every existing row with "now + 7
-- days", which is the launch trial for existing accounts.
alter table public.profiles
  add column if not exists trial_ends_at timestamptz default (now() + interval '7 days');

-- Plan columns are set only by the server (admin, school slots, payments);
-- same protection as 20261004_battle_xp.sql, plus trial_ends_at.
create or replace function public.tg_protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old       jsonb := to_jsonb(old);
  v_patch     jsonb := '{}'::jsonb;
  k           text;
  v_protected text[] := array['total_points', 'battle_xp', 'streak_days', 'last_active_date', 'role',
                              'school_id', 'school_name', 'plan', 'plan_expires_at',
                              'trial_ends_at', 'access_expires_at'];
begin
  if current_user in ('anon', 'authenticated') then
    foreach k in array v_protected loop
      if v_old ? k then
        v_patch := v_patch || jsonb_build_object(k, v_old -> k);
      end if;
    end loop;
    new := jsonb_populate_record(new, v_patch);
  end if;
  return new;
end
$$;

-- ── Daily uses ───────────────────────────────────────────────────────────────
-- ref identifies the session (custom practice) or match (battle) that used
-- it, so a reload or retry of the same session never counts twice.
create table if not exists public.feature_usage (
  student_id uuid        not null,
  feature    text        not null,
  ref        text        not null,
  day        date        not null default public.app_today(),
  created_at timestamptz not null default now(),
  primary key (student_id, feature, ref)
);

create index if not exists feature_usage_day_idx on public.feature_usage (student_id, day);

alter table public.feature_usage enable row level security;

-- Counts one use of p_feature for today (Nigerian calendar day) unless the
-- student already has p_limit uses today. A ref already counted is allowed
-- again without counting. Concurrent calls for one student and feature are
-- serialised, so two tabs can't both take the last use.
create or replace function public.use_feature(
  p_student uuid,
  p_feature text,
  p_ref     text,
  p_limit   integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day  date := public.app_today();
  v_used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_student::text || ':' || p_feature, 0));

  select count(*)::int into v_used
    from public.feature_usage
   where student_id = p_student and feature = p_feature and day = v_day;

  if exists (select 1 from public.feature_usage
              where student_id = p_student and feature = p_feature and ref = p_ref) then
    return query select true, v_used;
    return;
  end if;

  if v_used >= p_limit then
    return query select false, v_used;
    return;
  end if;

  insert into public.feature_usage (student_id, feature, ref, day)
  values (p_student, p_feature, p_ref, v_day);
  return query select true, v_used + 1;
end
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
revoke execute on function public.use_feature(uuid, text, text, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.use_feature(uuid, text, text, integer) from anon;
    revoke all on public.feature_usage from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.use_feature(uuid, text, text, integer) from authenticated;
    revoke all on public.feature_usage from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.use_feature(uuid, text, text, integer) to service_role;
    grant select, insert, delete on public.feature_usage to service_role;
  end if;
end $$;

commit;
