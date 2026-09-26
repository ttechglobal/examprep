-- 20260926_scale_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Goes with the scale & robustness changes (see SCALE_CHANGES.md).
-- Run once in the Supabase SQL editor, top to bottom. Safe to re-run.
-- Run it BEFORE deploying the new app code: the new API routes call these
-- functions and will return errors until they exist.
--
-- What it does
--   1. Helper: app_today() — the calendar day in Nigeria (Africa/Lagos).
--   2. Columns the new code relies on (added only if missing).
--   3. student_daily_stats — one row per student per day with answered/correct
--      totals, kept up to date by a trigger on question_attempts and
--      backfilled from history. Leaderboards, activity and lifetime stats read
--      this instead of scanning every answer.
--   4. Streaks stored on profiles (last_active_date) instead of recomputed.
--   5. Idempotent session save in ONE transaction: save_practice_session().
--   6. award_xp() — atomic XP increments.
--   7. Leaderboard, analytics and question-sampling functions (SQL does the
--      counting; the API gets back a handful of rows, never raw answers).
--   8. Daily challenge: one row per slot, not per day.
--   9. Security: profile columns students must not edit; functions callable
--      only by the server (service_role).
--  10. Indexes for every hot query.
--
-- Assumes ids are uuid (as the app code documents) and question_attempts has
-- student_id, question_id, is_correct, topic_id, subject_id, created_at.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Helper ────────────────────────────────────────────────────────────────
create or replace function public.app_today()
returns date
language sql stable
set search_path = public
as $$ select (now() at time zone 'Africa/Lagos')::date $$;

-- ── 2. Columns ───────────────────────────────────────────────────────────────
alter table public.profiles          add column if not exists last_active_date date;
alter table public.profiles          add column if not exists streak_days      integer not null default 0;
alter table public.profiles          add column if not exists total_points     integer not null default 0;

alter table public.practice_sessions add column if not exists session_id      text;
alter table public.practice_sessions add column if not exists exam_type       text;
alter table public.practice_sessions add column if not exists mode            text;
alter table public.practice_sessions add column if not exists subject_name    text;
alter table public.practice_sessions add column if not exists topic_name      text;
alter table public.practice_sessions add column if not exists questions_count integer;
alter table public.practice_sessions add column if not exists correct_count   integer;
alter table public.practice_sessions add column if not exists duration_secs   integer;
alter table public.practice_sessions add column if not exists completed       boolean default true;
alter table public.practice_sessions add column if not exists xp_awarded      integer;

alter table public.question_attempts add column if not exists context       text;
alter table public.question_attempts add column if not exists subject_name  text;
alter table public.question_attempts add column if not exists exam_type     text;
alter table public.question_attempts add column if not exists session_id    text;
alter table public.question_attempts add column if not exists time_spent_ms integer;

-- One practice_sessions row per session_id. Remove exact repeats first (keeps
-- the earliest physical row) so the unique index can be built.
delete from public.practice_sessions a
using public.practice_sessions b
where a.session_id is not null
  and a.session_id = b.session_id
  and a.ctid > b.ctid;

create unique index if not exists practice_sessions_session_id_key
  on public.practice_sessions (session_id)
  where session_id is not null;

-- ── 3. student_daily_stats ───────────────────────────────────────────────────
create table if not exists public.student_daily_stats (
  student_id uuid    not null,
  day        date    not null,
  answered   integer not null default 0,
  correct    integer not null default 0,
  primary key (student_id, day)
);
create index if not exists student_daily_stats_day_idx
  on public.student_daily_stats (day, student_id);

-- Server-only table: RLS on with no policies = no access for anon/authenticated.
alter table public.student_daily_stats enable row level security;

create or replace function public.tg_question_attempts_daily_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_daily_stats (student_id, day, answered, correct)
  select student_id,
         (coalesce(created_at, now()) at time zone 'Africa/Lagos')::date,
         count(*),
         count(*) filter (where is_correct)
  from new_rows
  where student_id is not null
  group by 1, 2
  on conflict (student_id, day) do update
    set answered = public.student_daily_stats.answered + excluded.answered,
        correct  = public.student_daily_stats.correct  + excluded.correct;
  return null;
end
$$;

-- Block inserts while the trigger is swapped in and history is backfilled, so
-- no answer is counted twice or missed. Held only until COMMIT below.
lock table public.question_attempts in share row exclusive mode;

drop trigger if exists question_attempts_daily_stats on public.question_attempts;
create trigger question_attempts_daily_stats
  after insert on public.question_attempts
  referencing new table as new_rows
  for each statement
  execute function public.tg_question_attempts_daily_stats();

-- Backfill (rebuilt from scratch, so re-running the file stays correct).
truncate public.student_daily_stats;
insert into public.student_daily_stats (student_id, day, answered, correct)
select student_id,
       (created_at at time zone 'Africa/Lagos')::date,
       count(*),
       count(*) filter (where is_correct)
from public.question_attempts
where student_id is not null and created_at is not null
group by 1, 2;

-- ── 4. Streak backfill ───────────────────────────────────────────────────────
-- last_active_date = the student's most recent practice day. streak_days is
-- recomputed as the run of consecutive days ending on that day.
with days as (
  select student_id, day,
         day - (row_number() over (partition by student_id order by day))::int as grp
  from public.student_daily_stats
),
runs as (
  select student_id, max(day) as last_day, count(*) as len
  from days
  group by student_id, grp
),
latest as (
  select distinct on (student_id) student_id, last_day, len
  from runs
  order by student_id, last_day desc
)
update public.profiles p
set last_active_date = l.last_day,
    streak_days      = l.len
from latest l
where p.id = l.student_id;

-- ── 5. Session save (idempotent, atomic) ─────────────────────────────────────
-- p_session : { session_id, exam_type, mode, subject_name, topic_name,
--               questions_count, correct_count, duration_secs }
-- p_attempts: [{ question_id, is_correct, topic_id, subject_id, subject_name,
--               exam_type, time_spent_ms }]
-- A repeated session_id changes nothing and returns duplicate = true.
create or replace function public.save_practice_session(
  p_student  uuid,
  p_session  jsonb,
  p_attempts jsonb,
  p_xp       integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today    date := public.app_today();
  v_inserted integer;
  v_total    integer;
  v_streak   integer;
  v_last     date;
begin
  insert into public.practice_sessions
    (student_id, session_id, exam_type, mode, subject_name, topic_name,
     questions_count, correct_count, duration_secs, completed, xp_awarded)
  select p_student, r.session_id, r.exam_type, r.mode, r.subject_name, r.topic_name,
         r.questions_count, r.correct_count, r.duration_secs, true, greatest(p_xp, 0)
  from jsonb_populate_record(null::public.practice_sessions, p_session) r
  on conflict (session_id) where session_id is not null do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select total_points, streak_days, last_active_date
      into v_total, v_streak, v_last
    from public.profiles where id = p_student;
    return jsonb_build_object(
      'duplicate',    true,
      'xp_awarded',   0,
      'total_points', coalesce(v_total, 0),
      'streak_days',  case when v_last >= v_today - 1 then coalesce(v_streak, 0) else 0 end
    );
  end if;

  insert into public.question_attempts
    (student_id, question_id, is_correct, context, topic_id, subject_id,
     subject_name, exam_type, session_id, time_spent_ms)
  select p_student, a.question_id, coalesce(a.is_correct, false), 'practice',
         a.topic_id, a.subject_id, a.subject_name, a.exam_type,
         p_session ->> 'session_id', a.time_spent_ms
  from jsonb_populate_recordset(null::public.question_attempts, coalesce(p_attempts, '[]'::jsonb)) a
  where a.question_id is not null;

  update public.profiles
  set total_points     = coalesce(total_points, 0) + greatest(p_xp, 0),
      streak_days      = case
                           when last_active_date = v_today     then greatest(coalesce(streak_days, 0), 1)
                           when last_active_date = v_today - 1 then coalesce(streak_days, 0) + 1
                           else 1
                         end,
      last_active_date = v_today
  where id = p_student
  returning total_points, streak_days into v_total, v_streak;

  return jsonb_build_object(
    'duplicate',    false,
    'xp_awarded',   greatest(p_xp, 0),
    'total_points', coalesce(v_total, 0),
    'streak_days',  coalesce(v_streak, 0)
  );
end
$$;

-- ── 6. Atomic XP ─────────────────────────────────────────────────────────────
create or replace function public.award_xp(p_student uuid, p_xp integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set total_points = coalesce(total_points, 0) + greatest(p_xp, 0)
  where id = p_student
  returning total_points::integer
$$;

-- ── 7a. Leaderboards (window XP = 10 per correct answer, as before) ─────────
create or replace function public.leaderboard_top(
  p_from        date,
  p_to          date,
  p_limit       integer,
  p_student_ids uuid[] default null
)
returns table (student_id uuid, xp bigint, answered bigint, correct bigint, rank bigint)
language sql stable
security definer
set search_path = public
as $$
  with agg as (
    select d.student_id, sum(d.answered) as answered, sum(d.correct) as correct
    from public.student_daily_stats d
    where d.day between p_from and p_to
      and (p_student_ids is null or d.student_id = any(p_student_ids))
    group by d.student_id
    having sum(d.correct) > 0
  )
  select a.student_id::uuid, (a.correct * 10)::bigint, a.answered::bigint, a.correct::bigint,
         (rank() over (order by a.correct desc))::bigint
  from agg a
  order by a.correct desc, a.student_id
  limit greatest(p_limit, 0)
$$;

create or replace function public.leaderboard_me(
  p_student     uuid,
  p_from        date,
  p_to          date,
  p_student_ids uuid[] default null
)
returns table (xp bigint, answered bigint, correct bigint, rank bigint)
language sql stable
security definer
set search_path = public
as $$
  with mine as (
    select coalesce(sum(answered), 0) as answered, coalesce(sum(correct), 0) as correct
    from public.student_daily_stats
    where student_id = p_student and day between p_from and p_to
  )
  select (m.correct * 10)::bigint, m.answered::bigint, m.correct::bigint,
         case when m.correct = 0 then null::bigint else 1 + (
           select count(*) from (
             select d.student_id
             from public.student_daily_stats d
             where d.day between p_from and p_to
               and (p_student_ids is null or d.student_id = any(p_student_ids))
             group by d.student_id
             having sum(d.correct) > m.correct
           ) better
         ) end
  from mine m
$$;

-- All-time board (profiles.total_points), optionally within a set of students.
create or replace function public.alltime_top(p_limit integer, p_student_ids uuid[] default null)
returns table (student_id uuid, total_points bigint)
language sql stable
security definer
set search_path = public
as $$
  select id::uuid, total_points::bigint
  from public.profiles
  where total_points > 0
    and (p_student_ids is null or id = any(p_student_ids))
  order by total_points desc, id
  limit greatest(p_limit, 0)
$$;

create or replace function public.alltime_rank(p_student uuid, p_student_ids uuid[] default null)
returns bigint
language sql stable
security definer
set search_path = public
as $$
  select case when coalesce(me.total_points, 0) <= 0 then null::bigint else 1 + (
    select count(*) from public.profiles p
    where p.total_points > me.total_points
      and (p_student_ids is null or p.id = any(p_student_ids))
  ) end
  from public.profiles me
  where me.id = p_student
$$;

-- All-time answered/correct per student (for accuracy on the all-time board).
create or replace function public.lifetime_stats(p_student_ids uuid[])
returns table (student_id uuid, answered bigint, correct bigint)
language sql stable
security definer
set search_path = public
as $$
  select student_id, sum(answered)::bigint, sum(correct)::bigint
  from public.student_daily_stats
  where student_id = any(p_student_ids)
  group by student_id
$$;

-- ── 7b. Analytics over question_attempts (grouped in SQL) ───────────────────
-- Per student: totals + last activity since p_since.
create or replace function public.stats_by_student(p_student_ids uuid[], p_since timestamptz)
returns table (student_id uuid, answered bigint, correct bigint, last_active timestamptz)
language sql stable
security definer
set search_path = public
as $$
  select qa.student_id::uuid, count(*)::bigint, (count(*) filter (where qa.is_correct))::bigint,
         max(qa.created_at)::timestamptz
  from public.question_attempts qa
  where qa.student_id = any(p_student_ids)
    and qa.created_at >= p_since
  group by qa.student_id
$$;

-- Per student per subject (optionally one exam).
create or replace function public.stats_by_student_subject(
  p_student_ids uuid[],
  p_since       timestamptz,
  p_exam        text default null
)
returns table (student_id uuid, subject_id uuid, subject_name text, answered bigint, correct bigint)
language sql stable
security definer
set search_path = public
as $$
  select qa.student_id::uuid, qa.subject_id::uuid,
         coalesce(max(s.name::text), max(qa.subject_name::text)),
         count(*)::bigint, (count(*) filter (where qa.is_correct))::bigint
  from public.question_attempts qa
  left join public.subjects s on s.id = qa.subject_id
  where qa.student_id = any(p_student_ids)
    and (p_since is null or qa.created_at >= p_since)
    and (p_exam  is null or qa.exam_type = p_exam)
    and qa.subject_id is not null
  group by qa.student_id, qa.subject_id
$$;

-- Per topic across a set of students (optionally one exam / one subject).
create or replace function public.stats_by_topic(
  p_student_ids uuid[],
  p_since       timestamptz,
  p_exam        text default null,
  p_subject_id  uuid default null
)
returns table (topic_id uuid, topic_name text, subject_id uuid, subject_name text, answered bigint, correct bigint)
language sql stable
security definer
set search_path = public
as $$
  select qa.topic_id::uuid, max(t.name::text), qa.subject_id::uuid,
         coalesce(max(s.name::text), max(qa.subject_name::text)),
         count(*)::bigint, (count(*) filter (where qa.is_correct))::bigint
  from public.question_attempts qa
  left join public.topics   t on t.id = qa.topic_id
  left join public.subjects s on s.id = qa.subject_id
  where qa.student_id = any(p_student_ids)
    and (p_since      is null or qa.created_at >= p_since)
    and (p_exam       is null or qa.exam_type  = p_exam)
    and (p_subject_id is null or qa.subject_id = p_subject_id)
    and qa.topic_id is not null
  group by qa.topic_id, qa.subject_id
$$;

-- Weekly (Monday-start, Nigerian calendar) accuracy trend for one student.
create or replace function public.stats_by_week(
  p_student_id uuid,
  p_since      timestamptz,
  p_exam       text default null,
  p_subject_id uuid default null
)
returns table (week_start date, answered bigint, correct bigint)
language sql stable
security definer
set search_path = public
as $$
  select date_trunc('week', qa.created_at at time zone 'Africa/Lagos')::date,
         count(*)::bigint, (count(*) filter (where qa.is_correct))::bigint
  from public.question_attempts qa
  where qa.student_id = p_student_id
    and (p_since      is null or qa.created_at >= p_since)
    and (p_exam       is null or qa.exam_type  = p_exam)
    and (p_subject_id is null or qa.subject_id = p_subject_id)
  group by 1
  order by 1
$$;

-- Distinct active students in consecutive day-buckets ending on p_end.
-- bucket 0 = the most recent p_bucket_days days.
create or replace function public.active_students_by_bucket(
  p_student_ids uuid[],
  p_end         date,
  p_bucket_days integer,
  p_buckets     integer
)
returns table (bucket integer, bucket_start date, active bigint)
language sql stable
security definer
set search_path = public
as $$
  select b.i::integer,
         (p_end - ((b.i + 1) * p_bucket_days - 1))::date,
         (select count(distinct d.student_id)::bigint
          from public.student_daily_stats d
          where d.student_id = any(p_student_ids)
            and d.day between p_end - ((b.i + 1) * p_bucket_days - 1) and p_end - b.i * p_bucket_days)
  from generate_series(0, greatest(p_buckets, 1) - 1) as b(i)
  order by b.i
$$;

-- ── 7c. Question bank ────────────────────────────────────────────────────────
-- Active question count per topic for one subject + exam.
create or replace function public.topic_question_counts(p_subject_id uuid, p_exam text)
returns table (topic_id uuid, question_count bigint)
language sql stable
security definer
set search_path = public
as $$
  select q.topic_id::uuid, count(*)::bigint
  from public.questions q
  where q.subject_id = p_subject_id
    and q.is_active
    and q.exam_type in (p_exam, 'BOTH')
    and q.topic_id is not null
  group by q.topic_id
$$;

-- A random candidate pool for a practice session in ONE round trip.
-- With p_year_spread, rows are interleaved across years (1st of each year,
-- then 2nd of each year, …) so a session isn't dominated by one paper.
create or replace function public.get_practice_questions(
  p_subject_ids uuid[],
  p_exam        text,
  p_topic_id    uuid    default null,
  p_exclude     text[]  default null,
  p_pool        integer default 60,
  p_year_spread boolean default true
)
returns setof jsonb
language sql volatile
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'id',             q.id,
           'question_text',  q.question_text,
           'options',        q.options,
           'correct_answer', q.correct_answer,
           'year',           q.year,
           'difficulty',     q.difficulty,
           'explanation',    q.explanation,
           'passage_text',   q.passage_text,
           'topic_id',       q.topic_id,
           'subject_id',     q.subject_id,
           'topic_name',     t.name,
           'subject_name',   s.name)
  from (
    select q.*,
           row_number() over (partition by q.year order by random()) as year_rank,
           random() as r
    from public.questions q
    where q.is_active
      and q.subject_id = any(p_subject_ids)
      and q.exam_type in (p_exam, 'BOTH')
      and (p_topic_id is null or q.topic_id = p_topic_id)
      and (p_exclude  is null or not (q.id::text = any(p_exclude)))
  ) q
  left join public.topics   t on t.id = q.topic_id
  left join public.subjects s on s.id = q.subject_id
  order by case when p_year_spread then q.year_rank else 0 end, q.r
  limit least(greatest(p_pool, 1), 400)
$$;

-- ── 7d. Battle vs computer: one atomic, idempotent update per finished match ─
-- Replaces read-then-write in the API (two tabs could lose a result).
-- Keeps the last 10 results (recent_form, newest first) for the W/D/L strip.
-- Computer difficulty: 3+ wins → medium, 8+ → hard (as before).
alter table public.battle_stats add column if not exists recent_form     text not null default '';
alter table public.battle_stats add column if not exists last_session_id text;
drop function if exists public.record_battle_result(uuid, text, integer);

create or replace function public.record_battle_result(
  p_student    uuid,
  p_outcome    text,
  p_xp         integer,
  p_session_id text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.battle_stats as b
    (student_id, battles_played, battles_won, battles_drawn, battles_lost,
     ai_difficulty, total_battle_xp, recent_form, last_session_id, last_battle_at, updated_at)
  values (p_student, 1,
          (p_outcome = 'win')::int, (p_outcome = 'draw')::int, (p_outcome = 'loss')::int,
          'easy', greatest(p_xp, 0),
          case p_outcome when 'win' then 'W' when 'draw' then 'D' else 'L' end,
          p_session_id, now(), now())
  on conflict (student_id) do update set
    battles_played  = b.battles_played + 1,
    battles_won     = b.battles_won   + (p_outcome = 'win')::int,
    battles_drawn   = b.battles_drawn + (p_outcome = 'draw')::int,
    battles_lost    = b.battles_lost  + (p_outcome = 'loss')::int,
    ai_difficulty   = case
                        when b.battles_won + (p_outcome = 'win')::int >= 8 then 'hard'
                        when b.battles_won + (p_outcome = 'win')::int >= 3 then 'medium'
                        else 'easy' end,
    total_battle_xp = coalesce(b.total_battle_xp, 0) + greatest(p_xp, 0),
    recent_form     = left(case p_outcome when 'win' then 'W' when 'draw' then 'D' else 'L' end
                           || coalesce(b.recent_form, ''), 10),
    last_session_id = p_session_id,
    last_battle_at  = now(),
    updated_at      = now()
  -- A retry of the same match changes nothing.
  where p_session_id is null or b.last_session_id is distinct from p_session_id
$$;

-- ── 8. Daily challenge: one row per student per day per slot ────────────────
alter table public.daily_quiz_attempts add column if not exists slot smallint not null default 1;

-- Drop whatever unique constraint/index currently covers exactly
-- (student_id, quiz_date) — its name isn't known in advance.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.daily_quiz_attempts'::regclass
      and c.contype in ('u', 'p')
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(c.conkey) k join pg_attribute a
             on a.attrelid = c.conrelid and a.attnum = k)
          = array['quiz_date', 'student_id']
  loop
    execute format('alter table public.daily_quiz_attempts drop constraint %I', r.conname);
  end loop;

  for r in
    select i.indexrelid::regclass::text as idx
    from pg_index i
    where i.indrelid = 'public.daily_quiz_attempts'::regclass
      and i.indisunique and not i.indisprimary
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(i.indkey) k join pg_attribute a
             on a.attrelid = i.indrelid and a.attnum = k)
          = array['quiz_date', 'student_id']
  loop
    execute format('drop index %s', r.idx);
  end loop;
end
$$;

create unique index if not exists daily_quiz_attempts_student_date_slot_key
  on public.daily_quiz_attempts (student_id, quiz_date, slot);

-- Today's board, ranked in SQL across both slots.
create or replace function public.daily_quiz_board(p_date date, p_limit integer default 30)
returns table (student_id uuid, correct bigint, total bigint, xp_earned bigint,
               completed bigint, last_updated timestamptz)
language sql stable
security definer
set search_path = public
as $$
  select student_id::uuid,
         (count(*) filter (where correct))::bigint,
         count(*)::bigint,
         coalesce(sum(xp_awarded), 0)::bigint,
         (count(*) filter (where completed))::bigint,
         max(updated_at)::timestamptz
  from public.daily_quiz_attempts
  where quiz_date = p_date and attempts_used > 0
  group by student_id
  order by 2 desc, 4 desc, 3 asc, 6 asc
  limit greatest(p_limit, 0)
$$;

-- ── 9a. Profile columns only the server may change ──────────────────────────
-- A student's own login (role anon/authenticated, e.g. a direct update with
-- the public key) may edit their profile where RLS allows, but these columns
-- snap back to their old values. Our own database functions run as their
-- owner (security definer), so current_user is not anon/authenticated there
-- and they can award XP and streaks. The server (service_role) is unaffected.
create or replace function public.tg_protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old       jsonb := to_jsonb(old);
  v_patch     jsonb := '{}'::jsonb;
  k           text;
  v_protected text[] := array['total_points', 'streak_days', 'last_active_date', 'role',
                              'school_id', 'school_name', 'plan', 'plan_expires_at',
                              'access_expires_at'];
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

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.tg_protect_profile_columns();

-- ── 9b. Server-only functions ────────────────────────────────────────────────
-- Postgres lets PUBLIC execute new functions by default, and Supabase exposes
-- every public function over its API. Without this, anyone holding the anon
-- key (it ships in the app) could call save_practice_session for any student.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'save_practice_session', 'award_xp', 'leaderboard_top', 'leaderboard_me',
        'alltime_top', 'alltime_rank',
        'lifetime_stats', 'stats_by_student', 'stats_by_student_subject',
        'stats_by_topic', 'stats_by_week', 'active_students_by_bucket',
        'topic_question_counts', 'get_practice_questions', 'daily_quiz_board',
        'record_battle_result',
        -- pre-existing XP / admin helpers: same exposure, same fix
        'increment_points', 'increment_coverage')
  loop
    execute format('revoke execute on function %s from public', r.sig);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', r.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', r.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', r.sig);
    end if;
  end loop;
end
$$;

-- ── 10. Indexes for the hot paths ────────────────────────────────────────────
create index if not exists question_attempts_student_created_idx
  on public.question_attempts (student_id, created_at);
create index if not exists questions_sampling_idx
  on public.questions (subject_id, exam_type, is_active);
create index if not exists questions_topic_idx
  on public.questions (topic_id) where is_active;
create index if not exists profiles_total_points_idx
  on public.profiles (total_points desc) where total_points > 0;
create index if not exists profiles_school_idx
  on public.profiles (school_id) where school_id is not null;
create index if not exists practice_sessions_student_idx
  on public.practice_sessions (student_id, created_at);
create index if not exists daily_quiz_attempts_date_idx
  on public.daily_quiz_attempts (quiz_date);

commit;

-- ── After running: quick checks ──────────────────────────────────────────────
-- 1) Tables the public anon key can reach with RLS OFF (should return nothing
--    except tables you deliberately made public):
--      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- 2) Stats match history:
--      select sum(answered) from student_daily_stats;
--      select count(*) from question_attempts;
