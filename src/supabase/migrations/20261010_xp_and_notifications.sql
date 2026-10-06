-- 20261010_xp_and_notifications.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Weekly leaderboard XP follows the new rate: 5 XP per correct answer (it was
--    10). Ranking is unchanged (it is by correct answers); only the XP shown
--    changes, so the board agrees with what practice now awards (lib/xp.js).
-- 2. notification_context(): what the reminder function needs to personalise a
--    batch of students' notifications (send-notifications / messages.ts).
-- Run in the Supabase SQL editor AFTER 20261009_frequency_and_missions.sql and
-- BEFORE deploying the app code and the send-notifications function. Safe to
-- re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Leaderboard window XP: correct × 5 ───────────────────────────────────
-- Same bodies as 20260926_scale_hardening.sql except × 5.
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
  select a.student_id::uuid, (a.correct * 5)::bigint, a.answered::bigint, a.correct::bigint,
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
  select (m.correct * 5)::bigint, m.answered::bigint, m.correct::bigint,
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

-- ── 2. Notification context ─────────────────────────────────────────────────
-- Length of a jsonb array; 0 for anything else (null, missing, not an array).
create or replace function public.json_array_len(j jsonb)
returns integer
language sql immutable
set search_path = public
as $$ select case when jsonb_typeof(j) = 'array' then jsonb_array_length(j) else 0 end $$;

-- One row per student: first name, streak (0 once it has lapsed), whether they
-- practised today, whether they have subjects (so missions apply), and this
-- week's missions: how many, how many still open, and the open one closest to done.
create or replace function public.notification_context(p_user_ids uuid[])
returns table (
  user_id         uuid,
  first_name      text,
  streak_days     integer,
  practiced_today boolean,
  has_subjects    boolean,
  missions_total  integer,
  missions_open   integer,
  next_topic      text
)
language sql stable
security definer
set search_path = public
as $$
  select p.id::uuid,
         nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''),
         case when p.last_active_date >= public.app_today() - 1 then coalesce(p.streak_days, 0) else 0 end,
         coalesce(p.last_active_date = public.app_today(), false),
         (public.json_array_len(to_jsonb(p) -> 'subjects_waec')
          + public.json_array_len(to_jsonb(p) -> 'subjects_jamb')
          + public.json_array_len(to_jsonb(p) -> 'subjects')) > 0,
         coalesce(ms.total, 0),
         coalesce(ms.open, 0),
         ms.next_topic
  from public.profiles p
  left join lateral (
    select count(*)::integer as total,
           (count(*) filter (where x.progress < x.target))::integer as open,
           (array_agg(x.topic_name order by x.progress::numeric / x.target desc)
              filter (where x.progress < x.target))[1] as next_topic
    from (
      select m.topic_name,
             m.target_questions as target,
             public.mission_progress_count(m.student_id, m.topic_id, m.week_start) as progress
      from public.weekly_missions m
      where m.student_id = p.id and m.week_start = public.mission_week_start()
    ) x
  ) ms on true
  where p.id = any(p_user_ids)
$$;

-- Server-only, like the other helpers.
do $$
begin
  revoke execute on function public.notification_context(uuid[]) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.notification_context(uuid[]) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.notification_context(uuid[]) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.notification_context(uuid[]) to service_role;
  end if;
end $$;

commit;
