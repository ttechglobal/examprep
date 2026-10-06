-- 20261008_analytics.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin Analytics: how ExamPrep is used. Run in the Supabase SQL editor AFTER
-- 20261007_schools_and_admin_log.sql and BEFORE deploying the app code that
-- uses it. Safe to re-run.
--
--   student_events          what the existing tables don't record:
--                             session_start     a practice / battle / mock
--                                               session started (its questions
--                                               were served)
--                             session_complete  that session was saved
--                             flashcards_open   a flashcard deck was opened
--                             upgrade_view      the upgrade sheet was shown
--                                               (detail.reason: premium | limit)
--                             upgrade_click     "Get Premium on WhatsApp" tapped
--                           One row per (student, event, ref), so retries and
--                           reloads never count twice. Signed-in students only.
--   analytics_* functions   every number on the page, counted here. Each takes
--                           the page's filters:
--                             p_from, p_to  Nigerian calendar days, inclusive
--                             p_exam        WAEC | JAMB | null
--                             p_plan        free | trial | premium | null (the
--                                           student's plan now)
--                             p_school      a school id | null
--
-- An ACTIVE student did something meaningful that day: answered a question
-- (practice, battle, mock, daily challenge), started a session or opened
-- flashcards. Opening the app alone doesn't count.
--
-- Features (lib/analytics.js has the same list and labels):
--   topic · quick5 · custom (Custom and Study Practice) · speed (Speed Round)
--   · mock · battle (vs computer) · battle_friends · daily_challenge · flashcards
-- Sessions and students per feature come from saved sessions (all history);
-- started vs completed comes from student_events (from this release on).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Check the live columns this relies on ───────────────────────────────────
do $$
declare
  v_expected constant jsonb := '{
    "profiles.exam_type": "text", "profiles.exam_types": "ARRAY", "profiles.created_at": "timestamp with time zone",
    "profiles.trial_ends_at": "timestamp with time zone", "profiles.school_id": "uuid",
    "question_attempts.student_id": "uuid", "question_attempts.subject_id": "uuid", "question_attempts.topic_id": "uuid",
    "question_attempts.is_correct": "boolean", "question_attempts.exam_type": "text",
    "question_attempts.created_at": "timestamp with time zone", "question_attempts.subject_name": "text",
    "practice_sessions.student_id": "uuid", "practice_sessions.mode": "text", "practice_sessions.topic_name": "text",
    "practice_sessions.created_at": "timestamp with time zone", "practice_sessions.exam_type": "text",
    "daily_quiz_attempts.student_id": "uuid", "daily_quiz_attempts.quiz_date": "date", "daily_quiz_attempts.completed": "boolean",
    "pvp_matches.host_id": "uuid", "pvp_matches.guest_id": "uuid", "pvp_matches.status": "text",
    "pvp_matches.started_at": "timestamp with time zone",
    "student_daily_stats.day": "date", "student_daily_stats.answered": "integer"
  }';
  v_key text; v_type text; v_found text;
begin
  for v_key, v_type in select key, value from jsonb_each_text(v_expected) loop
    select data_type into v_found from information_schema.columns
     where table_schema = 'public' and table_name = split_part(v_key, '.', 1) and column_name = split_part(v_key, '.', 2);
    if v_found is distinct from v_type then
      raise exception '% must be % (found %). Fix it before running this migration.', v_key, v_type, coalesce(v_found, 'no column');
    end if;
  end loop;
end $$;

-- ── Events ───────────────────────────────────────────────────────────────────
create table if not exists public.student_events (
  id         bigint      generated always as identity primary key,
  student_id uuid        not null,
  event      text        not null check (event in ('session_start', 'session_complete', 'flashcards_open', 'upgrade_view', 'upgrade_click')),
  feature    text,
  ref        text,
  detail     jsonb       not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create unique index if not exists student_events_once on public.student_events (student_id, event, ref) where ref is not null;
create index if not exists student_events_at_idx on public.student_events (at, event);
alter table public.student_events enable row level security;

create or replace function public.record_student_event(
  p_student uuid, p_event text, p_feature text, p_ref text, p_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.student_events (student_id, event, feature, ref, detail)
  values (p_student, p_event, p_feature, p_ref, coalesce(p_detail, '{}'::jsonb))
  on conflict (student_id, event, ref) where ref is not null do nothing;
$$;

-- ── Indexes for range scans ──────────────────────────────────────────────────
create index if not exists question_attempts_created_idx on public.question_attempts (created_at);
create index if not exists practice_sessions_created_idx on public.practice_sessions (created_at);
create index if not exists profiles_created_idx on public.profiles (created_at);
create index if not exists pvp_matches_started_idx on public.pvp_matches (started_at);
create index if not exists subscriptions_created_idx on public.subscriptions (created_at);

-- ── Shared pieces ────────────────────────────────────────────────────────────
-- The feature a saved session belongs to (same rule as lib/analytics.js).
create or replace function public.analytics_session_feature(p_mode text, p_topic text)
returns text
language sql immutable
as $$
  select case p_mode
    when 'quick5' then 'quick5' when 'mock' then 'mock' when 'battle' then 'battle' when 'timed' then 'speed'
    else case when nullif(trim(p_topic), '') is not null then 'topic' else 'custom' end
  end
$$;

-- A student's plan now: premium (paid or school) | trial | free.
create or replace function public.analytics_plan_of(p_plan text, p_expires timestamptz, p_trial timestamptz)
returns text
language sql stable
as $$
  select case when p_plan = 'premium' and (p_expires is null or p_expires > now()) then 'premium'
              when p_trial > now() then 'trial' else 'free' end
$$;

-- The students the filters select; null when no filter is set (everyone),
-- so unfiltered queries skip the membership check.
create or replace function public.analytics_scope(p_exam text, p_plan text, p_school uuid)
returns uuid[]
language sql stable
security definer
set search_path = public
as $$
  select case when p_exam is null and p_plan is null and p_school is null then null else
    coalesce((select array_agg(p.id) from public.profiles p
      where coalesce(p.role, 'student') = 'student'
        and (p_exam is null or p.exam_type = p_exam or p_exam = any(coalesce(p.exam_types, '{}'::text[])))
        and (p_school is null or p.school_id = p_school)
        and (p_plan is null or public.analytics_plan_of(p.plan, p.plan_expires_at, p.trial_ends_at) = p_plan)), '{}'::uuid[])
  end
$$;

-- Lagos midnight at the start of a day.
create or replace function public.analytics_day_start(p_day date)
returns timestamptz
language sql immutable
as $$ select (p_day::timestamp at time zone 'Africa/Lagos') $$;

-- Every (student, day) with meaningful activity between two days.
create or replace function public.analytics_active_days(p_from date, p_to date, p_scope uuid[])
returns table (student_id uuid, day date)
language sql stable
security definer
set search_path = public
as $$
  select a.student_id, a.day from (
    select d.student_id, d.day from public.student_daily_stats d
     where d.day between p_from and p_to and d.answered > 0
    union
    select q.student_id, q.quiz_date from public.daily_quiz_attempts q
     where q.quiz_date between p_from and p_to
    union
    select e.student_id, (e.at at time zone 'Africa/Lagos')::date from public.student_events e
     where e.at >= public.analytics_day_start(p_from) and e.at < public.analytics_day_start(p_to + 1)
       and e.event in ('session_start', 'flashcards_open')
  ) a
  where p_scope is null or a.student_id = any(p_scope)
$$;

-- ── Overview numbers ─────────────────────────────────────────────────────────
-- Each figure has the same-length period before it for the change arrows.
create or replace function public.analytics_kpis(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_scope uuid[] := public.analytics_scope(p_exam, p_plan, p_school);
  v_len   integer := p_to - p_from + 1;
  v_pfrom date := p_from - v_len;
  v_pto   date := p_from - 1;
  v_result jsonb;
begin
  with active as (select * from public.analytics_active_days(least(v_pfrom, p_to - 13), p_to, v_scope)),
  answers as (
    select (qa.created_at at time zone 'Africa/Lagos')::date as day, qa.is_correct
      from public.question_attempts qa
     where qa.created_at >= public.analytics_day_start(v_pfrom) and qa.created_at < public.analytics_day_start(p_to + 1)
       and (v_scope is null or qa.student_id = any(v_scope))
       and (p_exam is null or qa.exam_type = p_exam)
  ),
  sessions as (
    select (s.created_at at time zone 'Africa/Lagos')::date as day
      from public.practice_sessions s
     where s.created_at >= public.analytics_day_start(v_pfrom) and s.created_at < public.analytics_day_start(p_to + 1)
       and (v_scope is null or s.student_id = any(v_scope))
       and (p_exam is null or s.exam_type = p_exam)
  ),
  joined as (
    select (p.created_at at time zone 'Africa/Lagos')::date as day
      from public.profiles p
     where coalesce(p.role, 'student') = 'student'
       and p.created_at >= public.analytics_day_start(v_pfrom) and p.created_at < public.analytics_day_start(p_to + 1)
       and (v_scope is null or p.id = any(v_scope))
  ),
  plans as (
    select public.analytics_plan_of(p.plan, p.plan_expires_at, p.trial_ends_at) as plan
      from public.profiles p
     where coalesce(p.role, 'student') = 'student' and (v_scope is null or p.id = any(v_scope))
  )
  select jsonb_build_object(
    'active_today',     (select count(distinct student_id) from active where day = p_to),
    'active_yesterday', (select count(distinct student_id) from active where day = p_to - 1),
    'active_week',      (select count(distinct student_id) from active where day between p_to - 6 and p_to),
    'active_prev_week', (select count(distinct student_id) from active where day between p_to - 13 and p_to - 7),
    'active_period',    (select count(distinct student_id) from active where day between p_from and p_to),
    'active_prev',      (select count(distinct student_id) from active where day between v_pfrom and v_pto),
    'questions',        (select count(*) from answers where day >= p_from),
    'questions_prev',   (select count(*) from answers where day <= v_pto),
    'accuracy',         (select round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0)) from answers where day >= p_from),
    'sessions',         (select count(*) from sessions where day >= p_from),
    'sessions_prev',    (select count(*) from sessions where day <= v_pto),
    'new_students',     (select count(*) from joined where day >= p_from),
    'new_prev',         (select count(*) from joined where day <= v_pto),
    'students',         (select count(*) from plans),
    'premium',          (select count(*) from plans where plan = 'premium'),
    'trial',            (select count(*) from plans where plan = 'trial')
  ) into v_result;
  return v_result;
end
$$;

-- Active students and questions per day.
create or replace function public.analytics_daily(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns table (day date, active integer, questions integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  active as (select a.day, count(distinct a.student_id) as n
               from scope, public.analytics_active_days(p_from, p_to, scope.ids) a group by a.day),
  answers as (
    select (qa.created_at at time zone 'Africa/Lagos')::date as day, count(*) as n
      from public.question_attempts qa, scope
     where qa.created_at >= public.analytics_day_start(p_from) and qa.created_at < public.analytics_day_start(p_to + 1)
       and (scope.ids is null or qa.student_id = any(scope.ids))
       and (p_exam is null or qa.exam_type = p_exam)
     group by 1
  )
  select g.day::date, coalesce(a.n, 0)::int, coalesce(q.n, 0)::int
  from generate_series(p_from, p_to, interval '1 day') g(day)
  left join active a on a.day = g.day::date
  left join answers q on q.day = g.day::date
  order by 1
$$;

-- New vs returning students, in 7-day weeks ending on p_to (oldest first).
--   new: joined that week and active in it · returning: active that week, joined before it
create or replace function public.analytics_new_returning(p_to date, p_weeks integer, p_exam text, p_plan text, p_school uuid)
returns table (week_start date, week_end date, new_students integer, returning_students integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  weeks as (select (p_to - 7 * i - 6) as ws, (p_to - 7 * i) as we from generate_series(0, least(greatest(p_weeks, 1), 26) - 1) i),
  active as (select distinct a.student_id, a.day from scope,
               public.analytics_active_days(p_to - 7 * least(greatest(p_weeks, 1), 26) + 1, p_to, scope.ids) a),
  joined as (select p.id, (p.created_at at time zone 'Africa/Lagos')::date as day from public.profiles p)
  select w.ws, w.we,
         count(distinct a.student_id) filter (where j.day between w.ws and w.we)::int,
         count(distinct a.student_id) filter (where j.day < w.ws)::int
  from weeks w
  left join active a on a.day between w.ws and w.we
  left join joined j on j.id = a.student_id
  group by w.ws, w.we
  order by w.ws
$$;

-- ── Features ─────────────────────────────────────────────────────────────────
-- Per feature: students, sessions (saved), started and completed (events).
create or replace function public.analytics_features(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns table (feature text, students integer, sessions integer, started integer, completed integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  bounds as (select public.analytics_day_start(p_from) as t1, public.analytics_day_start(p_to + 1) as t2),
  saved as (
    select public.analytics_session_feature(s.mode, s.topic_name) as feature, s.student_id
      from public.practice_sessions s, scope, bounds
     where s.created_at >= bounds.t1 and s.created_at < bounds.t2
       and (scope.ids is null or s.student_id = any(scope.ids))
       and (p_exam is null or s.exam_type = p_exam)
  ),
  events as (
    select e.feature, e.event, e.ref, e.student_id
      from public.student_events e, scope, bounds
     where e.at >= bounds.t1 and e.at < bounds.t2
       and e.event in ('session_start', 'session_complete', 'flashcards_open')
       and (scope.ids is null or e.student_id = any(scope.ids))
       and (p_exam is null or e.detail ->> 'exam' = p_exam)
  ),
  starts as (
    select st.feature, count(*) as started,
           count(*) filter (where exists (select 1 from public.student_events c
                                           where c.student_id = st.student_id and c.event = 'session_complete' and c.ref = st.ref)) as completed
      from events st where st.event = 'session_start' group by st.feature
  ),
  friends as (
    select pl.player as student_id, m.status
      from public.pvp_matches m, scope, bounds,
           lateral (values (m.host_id), (m.guest_id)) pl(player)
     where m.started_at >= bounds.t1 and m.started_at < bounds.t2 and pl.player is not null
       and exists (select 1 from public.profiles p where p.id = pl.player and coalesce(p.role, 'student') = 'student')
       and (scope.ids is null or pl.player = any(scope.ids))
  ),
  quiz as (
    select q.student_id, q.completed from public.daily_quiz_attempts q, scope
     where q.quiz_date between p_from and p_to and (scope.ids is null or q.student_id = any(scope.ids))
  ),
  rows as (
    select s.feature, count(distinct s.student_id) as students, count(*) as sessions from saved s group by s.feature
    union all
    select 'battle_friends', count(distinct f.student_id), count(*) from friends f
    union all
    select 'daily_challenge', count(distinct q.student_id), count(*) from quiz q
    union all
    select 'flashcards', count(distinct e.student_id), count(*) from events e where e.event = 'flashcards_open'
  )
  select f.feature,
         coalesce(max(r.students), 0)::int, coalesce(max(r.sessions), 0)::int,
         coalesce(case f.feature
           when 'battle_friends'  then (select count(*) from friends)
           when 'daily_challenge' then (select count(*) from quiz)
           else (select st.started from starts st where st.feature = f.feature) end, 0)::int,
         coalesce(case f.feature
           when 'battle_friends'  then (select count(*) from friends where status = 'finished')
           when 'daily_challenge' then (select count(*) from quiz where completed)
           else (select st.completed from starts st where st.feature = f.feature) end, 0)::int
  from unnest(array['topic', 'quick5', 'custom', 'speed', 'mock', 'battle', 'battle_friends', 'daily_challenge', 'flashcards']) f(feature)
  left join rows r on r.feature = f.feature
  group by f.feature
$$;

-- ── Learning ─────────────────────────────────────────────────────────────────
create or replace function public.analytics_subjects(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns table (subject text, questions integer, students integer, accuracy integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids)
  select coalesce(s.name, qa.subject_name, 'Other') as subject, count(*)::int, count(distinct qa.student_id)::int,
         round(100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0))::int
  from public.question_attempts qa
  cross join scope
  left join public.subjects s on s.id = qa.subject_id
  where qa.created_at >= public.analytics_day_start(p_from) and qa.created_at < public.analytics_day_start(p_to + 1)
    and (scope.ids is null or qa.student_id = any(scope.ids))
    and (p_exam is null or qa.exam_type = p_exam)
  group by 1
  order by 2 desc
$$;

-- p_order 'popular' (most answered) | 'difficult' (lowest accuracy among
-- topics with at least p_min answers, so a few lucky guesses don't rank).
create or replace function public.analytics_topics(
  p_from date, p_to date, p_exam text, p_plan text, p_school uuid, p_order text, p_limit integer, p_min integer
)
returns table (topic text, subject text, questions integer, students integer, accuracy integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  t as (
    select qa.topic_id, count(*) as n, count(distinct qa.student_id) as students,
           round(100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0)) as acc,
           max(qa.subject_id::text)::uuid as subject_id
      from public.question_attempts qa, scope
     where qa.created_at >= public.analytics_day_start(p_from) and qa.created_at < public.analytics_day_start(p_to + 1)
       and qa.topic_id is not null
       and (scope.ids is null or qa.student_id = any(scope.ids))
       and (p_exam is null or qa.exam_type = p_exam)
     group by qa.topic_id
  )
  select tp.name, coalesce(sj.name, '—'), t.n::int, t.students::int, t.acc::int
  from t
  join public.topics tp on tp.id = t.topic_id
  left join public.subjects sj on sj.id = coalesce(tp.subject_id, t.subject_id)
  where p_order <> 'difficult' or t.n >= greatest(p_min, 1)
  order by case when p_order = 'difficult' then t.acc end asc nulls last, t.n desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- WAEC vs JAMB: students who chose each exam, and questions answered in each.
create or replace function public.analytics_exams(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns table (exam text, students integer, questions integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids)
  select x.exam,
         (select count(*) from public.profiles p, scope
           where coalesce(p.role, 'student') = 'student' and (scope.ids is null or p.id = any(scope.ids))
             and (p.exam_type = x.exam or x.exam = any(coalesce(p.exam_types, '{}'::text[]))))::int,
         (select count(*) from public.question_attempts qa, scope
           where qa.exam_type = x.exam
             and qa.created_at >= public.analytics_day_start(p_from) and qa.created_at < public.analytics_day_start(p_to + 1)
             and (scope.ids is null or qa.student_id = any(scope.ids)))::int
  from unnest(array['WAEC', 'JAMB']) x(exam)
  where p_exam is null or x.exam = p_exam
$$;

-- ── Engagement ───────────────────────────────────────────────────────────────
-- Habits in the last 7 days of the range, and per-student averages for it.
create or replace function public.analytics_engagement(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_scope uuid[] := public.analytics_scope(p_exam, p_plan, p_school);
  v_result jsonb;
begin
  with period as (select * from public.analytics_active_days(least(p_from, p_to - 6), p_to, v_scope)),
  week as (select student_id, count(distinct day) as days from period where day between p_to - 6 and p_to group by student_id),
  per_student as (select student_id, count(distinct day) as days from period where day between p_from and p_to group by student_id),
  joined as (select p.id, (p.created_at at time zone 'Africa/Lagos')::date as day from public.profiles p
              where coalesce(p.role, 'student') = 'student' and (v_scope is null or p.id = any(v_scope))),
  sessions as (select count(*) as n from public.practice_sessions s
                where s.created_at >= public.analytics_day_start(p_from) and s.created_at < public.analytics_day_start(p_to + 1)
                  and (v_scope is null or s.student_id = any(v_scope)) and (p_exam is null or s.exam_type = p_exam)),
  answers as (select coalesce(sum(d.answered), 0) as n from public.student_daily_stats d
               where d.day between p_from and p_to and (v_scope is null or d.student_id = any(v_scope)))
  select jsonb_build_object(
    'active',             (select count(*) from per_student),
    'sessions',           (select n from sessions),
    'questions',          (select n from answers),
    'avg_study_days',     (select round(avg(days), 1) from per_student),
    'week_1_day',         (select count(*) from week where days = 1),
    'week_2_days',        (select count(*) from week where days = 2),
    'week_3plus_days',    (select count(*) from week where days >= 3),
    'new_this_week',      (select count(*) from joined where day between p_to - 6 and p_to),
    'returned_this_week', (select count(*) from week w join joined j on j.id = w.student_id where j.day < p_to - 6),
    'one_time',           (select count(*) from per_student ps join joined j on j.id = ps.student_id
                            where ps.days = 1 and j.day between p_from and p_to - 7)
  ) into v_result;
  return v_result;
end
$$;

-- Weekly cohorts: of students who joined in a 7-day week, the share active in
-- each of the next 4 weeks (null until that week has finished).
create or replace function public.analytics_retention(p_to date, p_weeks integer, p_exam text, p_plan text, p_school uuid)
returns table (cohort_start date, size integer, week1 integer, week2 integer, week3 integer, week4 integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  cohorts as (select (p_to - 7 * i - 6) as cs from generate_series(1, least(greatest(p_weeks, 1), 12)) i),
  members as (
    select c.cs, p.id from cohorts c
    join public.profiles p on coalesce(p.role, 'student') = 'student'
     and (p.created_at at time zone 'Africa/Lagos')::date between c.cs and c.cs + 6
    cross join scope where scope.ids is null or p.id = any(scope.ids)
  ),
  active as (select distinct a.student_id, a.day from scope,
               public.analytics_active_days(p_to - 7 * (least(greatest(p_weeks, 1), 12) + 1), p_to, scope.ids) a),
  share as (
    select m.cs, n.week,
           case when m.cs + 7 * n.week + 6 <= p_to then
             round(100.0 * count(distinct a.student_id) / nullif(count(distinct m.id), 0)) end as pct
      from members m
      cross join generate_series(1, 4) n(week)
      left join active a on a.student_id = m.id and a.day between m.cs + 7 * n.week and m.cs + 7 * n.week + 6
     group by m.cs, n.week
  )
  select c.cs, (select count(*) from members m where m.cs = c.cs)::int,
         (select pct from share where share.cs = c.cs and week = 1)::int,
         (select pct from share where share.cs = c.cs and week = 2)::int,
         (select pct from share where share.cs = c.cs and week = 3)::int,
         (select pct from share where share.cs = c.cs and week = 4)::int
  from cohorts c order by c.cs desc
$$;

-- ── Conversion ───────────────────────────────────────────────────────────────
create or replace function public.analytics_conversion(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_scope uuid[] := public.analytics_scope(p_exam, p_plan, p_school);
  v_t1 timestamptz := public.analytics_day_start(p_from);
  v_t2 timestamptz := public.analytics_day_start(p_to + 1);
  v_result jsonb;
begin
  with students as (
    select p.id, p.created_at, p.trial_ends_at, p.school_id,
           public.analytics_plan_of(p.plan, p.plan_expires_at, p.trial_ends_at) as plan_now
      from public.profiles p
     where coalesce(p.role, 'student') = 'student' and (v_scope is null or p.id = any(v_scope))
  ),
  paid as (select distinct s.student_id from public.subscriptions s where s.source = 'admin' and s.status = 'active'),
  paid_in_range as (select distinct s.student_id from public.subscriptions s
                     where s.source = 'admin' and s.created_at >= v_t1 and s.created_at < v_t2),
  ended as (select id from students where trial_ends_at >= v_t1 and trial_ends_at < v_t2 and trial_ends_at <= now())
  select jsonb_build_object(
    'trials_started',   (select count(*) from students where created_at >= v_t1 and created_at < v_t2 and trial_ends_at is not null),
    'trials_active',    (select count(*) from students where plan_now = 'trial'),
    'trials_ended',     (select count(*) from ended),
    'trials_converted', (select count(*) from ended e where e.id in (select student_id from paid)),
    'upgraded',         (select count(*) from students s where s.id in (select student_id from paid_in_range)),
    'plan_free',        (select count(*) from students where plan_now = 'free'),
    'plan_trial',       (select count(*) from students where plan_now = 'trial'),
    'plan_premium',     (select count(*) from students where plan_now = 'premium'),
    'upgrade_views',    (select count(*) from public.student_events e where e.event = 'upgrade_view' and e.at >= v_t1 and e.at < v_t2
                           and (v_scope is null or e.student_id = any(v_scope))),
    'upgrade_clicks',   (select count(*) from public.student_events e where e.event = 'upgrade_click' and e.at >= v_t1 and e.at < v_t2
                           and (v_scope is null or e.student_id = any(v_scope)))
  ) into v_result;
  return v_result;
end
$$;

-- What made students see the upgrade sheet, and how many then bought a plan
-- (an admin activated one within 30 days of their first view).
create or replace function public.analytics_triggers(p_from date, p_to date, p_exam text, p_plan text, p_school uuid)
returns table (feature text, reason text, views integer, students integer, conversions integer)
language sql stable
security definer
set search_path = public
as $$
  with scope as (select public.analytics_scope(p_exam, p_plan, p_school) as ids),
  views as (
    select coalesce(e.feature, 'general') as feature, coalesce(e.detail ->> 'reason', 'premium') as reason,
           e.student_id, e.at
      from public.student_events e, scope
     where e.event = 'upgrade_view'
       and e.at >= public.analytics_day_start(p_from) and e.at < public.analytics_day_start(p_to + 1)
       and (scope.ids is null or e.student_id = any(scope.ids))
  ),
  firsts as (select feature, reason, student_id, min(at) as first_at from views group by 1, 2, 3)
  select v.feature, v.reason, count(*)::int, count(distinct v.student_id)::int,
         (select count(*) from firsts f
           where f.feature = v.feature and f.reason = v.reason
             and exists (select 1 from public.subscriptions s where s.student_id = f.student_id and s.source = 'admin'
                           and s.created_at >= f.first_at and s.created_at < f.first_at + interval '30 days'))::int
  from views v
  group by v.feature, v.reason
  order by 3 desc
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.record_student_event(uuid, text, text, text, jsonb)',
    'public.analytics_scope(text, text, uuid)',
    'public.analytics_active_days(date, date, uuid[])',
    'public.analytics_kpis(date, date, text, text, uuid)',
    'public.analytics_daily(date, date, text, text, uuid)',
    'public.analytics_new_returning(date, integer, text, text, uuid)',
    'public.analytics_features(date, date, text, text, uuid)',
    'public.analytics_subjects(date, date, text, text, uuid)',
    'public.analytics_topics(date, date, text, text, uuid, text, integer, integer)',
    'public.analytics_exams(date, date, text, text, uuid)',
    'public.analytics_engagement(date, date, text, text, uuid)',
    'public.analytics_retention(date, integer, text, text, uuid)',
    'public.analytics_conversion(date, date, text, text, uuid)',
    'public.analytics_triggers(date, date, text, text, uuid)'
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
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on public.student_events from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on public.student_events from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant select, insert on public.student_events to service_role; end if;
end $$;

commit;
