-- 20261009_frequency_and_missions.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Topic frequency: how often each topic appears across past papers.
-- 2. Weekly battle missions built on that ranking.
-- 3. Removes the unused Core Topics table.
-- Run in the Supabase SQL editor AFTER 20261008_analytics.sql and BEFORE
-- deploying the app code that reads it. Safe to re-run.
--
--   topic_frequency(subject, exam)   one GROUP BY, so no 1,000-row cap. Ranks
--                                    topics by the number of distinct YEARS
--                                    they appeared in, then by question count.
--   weekly_missions                  one row per student per mission. The week
--                                    runs Monday to Sunday (Nigerian time).
--   mission_progress_count()         progress is never stored: it is the
--                                    student's battle answers on the topic
--                                    this week (question_attempts joined to
--                                    practice_sessions, mode = 'battle'), so it
--                                    cannot drift out of step.
--   create_weekly_missions()         creates a student's set once (locked)
--   claim_completed_missions()       awards each finished mission's XP once
--                                    (battle_results ledger, source 'mission',
--                                    plus total_points).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Topic frequency ───────────────────────────────────────────────────────
-- Past papers only: this is "how often does it appear in the real exam", so
-- AI-generated questions never count. bank_count is every active question for
-- the topic (any source): it says whether a mission on it is playable.
create or replace function public.topic_frequency(p_subject_id uuid, p_exam text)
returns table (
  topic_id       uuid,
  topic_name     text,
  order_index    integer,
  past_count     bigint,
  years_appeared integer,
  total_years    integer,
  share_pct      numeric,
  bank_count     bigint,
  rank           bigint
)
language sql stable
security definer
set search_path = public
as $$
  with past as (
    select q.topic_id, q.year::text as yr
    from public.questions q
    where q.subject_id = p_subject_id
      and q.is_active
      and q.source = 'past_paper'
      and q.exam_type in (p_exam, 'BOTH')
      and q.topic_id is not null
  ),
  totals as (
    select count(*)::numeric as n, count(distinct yr)::int as years from past
  ),
  per_topic as (
    select p.topic_id, count(*) as past_count, count(distinct p.yr)::int as years_appeared
    from past p
    group by p.topic_id
  ),
  bank as (
    select q.topic_id, count(*) as bank_count
    from public.questions q
    where q.subject_id = p_subject_id
      and q.is_active
      and q.exam_type in (p_exam, 'BOTH')
      and q.topic_id is not null
    group by q.topic_id
  )
  select t.id::uuid,
         t.name,
         t.order_index::integer,
         coalesce(f.past_count, 0)::bigint,
         coalesce(f.years_appeared, 0),
         tot.years,
         case when tot.n > 0 then round(coalesce(f.past_count, 0) / tot.n * 100, 1) else 0 end,
         coalesce(b.bank_count, 0)::bigint,
         rank() over (order by coalesce(f.years_appeared, 0) desc,
                               coalesce(f.past_count, 0) desc)
  from public.topics t
  cross join totals tot
  left join per_topic f on f.topic_id::text = t.id::text
  left join bank      b on b.topic_id::text = t.id::text
  where t.subject_id = p_subject_id
  order by 9, t.order_index
$$;

-- ── 2. Weekly missions ───────────────────────────────────────────────────────
create table if not exists public.weekly_missions (
  id               uuid        primary key default gen_random_uuid(),
  student_id       uuid        not null references public.profiles(id) on delete cascade,
  week_start       date        not null,                 -- the Monday
  exam             text        not null,
  subject_id       uuid        not null,
  topic_id         uuid        not null,
  subject_name     text        not null,
  topic_name       text        not null,
  target_questions integer     not null check (target_questions > 0),
  min_accuracy     integer     check (min_accuracy between 1 and 100),  -- reserved: not enforced yet
  xp_reward        integer     not null default 50 check (xp_reward >= 0),
  claimed_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (student_id, week_start, exam, topic_id)
);

create index if not exists weekly_missions_student_week_idx
  on public.weekly_missions (student_id, week_start desc);

-- Only the server (service_role) reads or writes missions.
alter table public.weekly_missions enable row level security;

-- Mission XP is written to the battle ledger.
-- Drop whatever check limits `source` (found by what it says, not by its name,
-- which depends on how the table was first created), then add the wider one.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.battle_results'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%source%'
  loop
    execute format('alter table public.battle_results drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.battle_results
  add constraint battle_results_source_check check (source in ('computer', 'pvp', 'mission'));

-- The Monday of the current Nigerian week.
create or replace function public.mission_week_start()
returns date
language sql stable
set search_path = public
as $$ select date_trunc('week', public.app_today()::timestamp)::date $$;

-- Battle answers on one topic during the week starting p_week.
create or replace function public.mission_progress_count(p_student uuid, p_topic uuid, p_week date)
returns integer
language sql stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.question_attempts a
  join public.practice_sessions s
    on s.session_id::text = a.session_id::text and s.student_id = a.student_id
  where a.student_id = p_student
    and s.mode = 'battle'
    and a.topic_id::text = p_topic::text
    and (a.created_at at time zone 'Africa/Lagos')::date between p_week and p_week + 6
$$;

-- This week's missions with live progress (capped at the target).
create or replace function public.list_weekly_missions(p_student uuid, p_week date default null)
returns table (
  id uuid, exam text, subject_id uuid, subject_name text, topic_id uuid, topic_name text,
  target_questions integer, min_accuracy integer, xp_reward integer,
  progress integer, claimed boolean, week_start date
)
language sql stable
security definer
set search_path = public
as $$
  select m.id, m.exam, m.subject_id, m.subject_name, m.topic_id, m.topic_name,
         m.target_questions, m.min_accuracy, m.xp_reward,
         least(public.mission_progress_count(m.student_id, m.topic_id, m.week_start), m.target_questions),
         m.claimed_at is not null,
         m.week_start
  from public.weekly_missions m
  where m.student_id = p_student
    and m.week_start = coalesce(p_week, public.mission_week_start())
  order by m.created_at, m.id
$$;

-- Creates a student's missions for a week, once. p_missions is
-- [{ exam, subject_id, subject_name, topic_id, topic_name, target_questions, xp_reward }].
-- Two requests at once can't both create a set: the second waits on the lock,
-- then sees the first one's rows and does nothing. Returns how many it made.
create or replace function public.create_weekly_missions(p_student uuid, p_week date, p_missions jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('weekly_missions:' || p_student::text, 0));
  if exists (select 1 from public.weekly_missions where student_id = p_student and week_start = p_week) then
    return 0;
  end if;
  insert into public.weekly_missions
    (student_id, week_start, exam, subject_id, topic_id, subject_name, topic_name, target_questions, xp_reward)
  select p_student, p_week, m.exam, m.subject_id, m.topic_id, m.subject_name, m.topic_name,
         m.target_questions, coalesce(m.xp_reward, 50)
  from jsonb_to_recordset(coalesce(p_missions, '[]'::jsonb))
       as m(exam text, subject_id uuid, topic_id uuid, subject_name text, topic_name text,
            target_questions integer, xp_reward integer)
  on conflict (student_id, week_start, exam, topic_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

-- Pays out every finished, unpaid mission from this week and last week (so a
-- mission finished late on Sunday is still paid on Monday). Returns the ids it
-- paid. Safe to call repeatedly: a mission is claimed once.
create or replace function public.claim_completed_missions(p_student uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week  date := public.mission_week_start();
  v_today date := public.app_today();
  m       public.weekly_missions;
  v_paid  uuid[] := '{}';
begin
  for m in
    select * from public.weekly_missions
    where student_id = p_student and claimed_at is null and week_start >= v_week - 7
    order by created_at
    for update
  loop
    if public.mission_progress_count(m.student_id, m.topic_id, m.week_start) >= m.target_questions then
      update public.weekly_missions set claimed_at = now() where id = m.id;
      insert into public.battle_results (student_id, ref, source, day, xp)
      values (p_student, 'mission-' || m.id::text, 'mission', v_today, m.xp_reward)
      on conflict (student_id, ref) do nothing;
      perform public.award_xp(p_student, m.xp_reward);
      v_paid := v_paid || m.id;
    end if;
  end loop;
  return v_paid;
end
$$;

-- ── 3. Core Topics is gone ───────────────────────────────────────────────────
-- Nothing outside the old admin page read this table.
drop table if exists public.core_topics cascade;

-- Access codes were replaced by subscriptions (20261006). The code is already
-- deleted. Check the table holds nothing you still need, then run this by hand:
--   drop table if exists public.access_codes cascade;

-- ── Server-only ──────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.topic_frequency(uuid, text)',
    'public.mission_progress_count(uuid, uuid, date)',
    'public.list_weekly_missions(uuid, date)',
    'public.create_weekly_missions(uuid, date, jsonb)',
    'public.claim_completed_missions(uuid)'
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
    revoke all on public.weekly_missions from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.weekly_missions from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.weekly_missions to service_role;
  end if;
end $$;

commit;
