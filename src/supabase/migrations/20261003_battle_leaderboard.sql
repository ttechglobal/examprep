-- 20261003_battle_leaderboard.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Battle leaderboard: XP earned in battles only, ranked by week or all time.
-- Run in the Supabase SQL editor AFTER 20260928_pvp_engine.sql and BEFORE
-- deploying the app code that reads it. Safe to re-run.
--
-- Battle XP still counts towards profiles.total_points (the main leaderboard);
-- this ledger only scopes it so battles get a board of their own.
--
--   battle_results            one row per student per finished battle
--     · computer battles      xp from the server-checked session save
--                             (practice_sessions, mode = 'battle'); outcome
--                             from record_battle_result (same session_id)
--     · 1v1 battles           xp and outcome when pvp_matches finishes
--   battle_leaderboard_top    top N for a range of Nigerian calendar days
--   battle_leaderboard_me     one student's total and true rank
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.battle_results (
  student_id uuid        not null,
  ref        text        not null,                 -- session_id, or 'pvp-<match id>'
  source     text        not null check (source in ('computer', 'pvp')),
  day        date        not null default public.app_today(),
  xp         integer     not null default 0 check (xp >= 0),
  outcome    text        check (outcome in ('win', 'draw', 'loss')),
  created_at timestamptz not null default now(),
  primary key (student_id, ref)
);

create index if not exists battle_results_day_idx on public.battle_results (day, student_id);

-- Only the server (service_role) reads or writes the ledger.
alter table public.battle_results enable row level security;

-- ── Computer battles: XP from the verified session save ─────────────────────
create or replace function public.battle_results_from_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mode = 'battle' and new.student_id is not null and new.session_id is not null then
    insert into public.battle_results (student_id, ref, source, day, xp)
    values (new.student_id, new.session_id, 'computer',
            (coalesce(new.created_at, now()) at time zone 'Africa/Lagos')::date,
            greatest(coalesce(new.xp_awarded, 0), 0))
    on conflict (student_id, ref) do update
      set xp = excluded.xp, day = excluded.day;
  end if;
  return new;
exception when others then
  -- The leaderboard must never block a session save.
  raise warning 'battle_results_from_session: %', sqlerrm;
  return new;
end
$$;

drop trigger if exists battle_results_from_session on public.practice_sessions;
create trigger battle_results_from_session
  after insert on public.practice_sessions
  for each row execute function public.battle_results_from_session();

-- ── Computer battles: outcome (same body as 20260927, plus the ledger) ──────
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
  where p_session_id is null or b.last_session_id is distinct from p_session_id;

  -- XP is left to the session save; this only records how the match ended.
  insert into public.battle_results (student_id, ref, source, outcome)
  select p_student, p_session_id, 'computer', p_outcome
  where p_session_id is not null
  on conflict (student_id, ref) do update set outcome = excluded.outcome;
$$;

-- ── 1v1 battles: one row per signed-in player when the match finishes ───────
-- XP mirrors pvp_finish: correct × 10, +20 win, +10 draw. Anonymous invite
-- players earn no XP and are left out, as in pvp_finish.
create or replace function public.battle_results_from_pvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    insert into public.battle_results (student_id, ref, source, day, xp, outcome)
    select pl.id, 'pvp-' || new.id::text, 'pvp', public.app_today(),
           c.correct * 10 + case r.ch when 'W' then 20 when 'D' then 10 else 0 end,
           case r.ch when 'W' then 'win' when 'D' then 'draw' else 'loss' end
    from (values (new.host_id, 'host', new.host_is_anonymous),
                 (new.guest_id, 'guest', new.guest_is_anonymous)) as pl(id, role, anon)
    cross join lateral (
      select count(*)::int as correct from public.pvp_answers a
      where a.match_id = new.id and a.player_id = pl.id and a.is_correct
    ) c
    cross join lateral (
      select case when new.result = 'draw' then 'D' when new.result = pl.role then 'W' else 'L' end as ch
    ) r
    where pl.id is not null and not coalesce(pl.anon, false)
      and exists (select 1 from public.profiles p where p.id = pl.id)
    on conflict (student_id, ref) do nothing;
  end if;
  return new;
exception when others then
  raise warning 'battle_results_from_pvp: %', sqlerrm;
  return new;
end
$$;

drop trigger if exists battle_results_from_pvp on public.pvp_matches;
create trigger battle_results_from_pvp
  after update of status on public.pvp_matches
  for each row execute function public.battle_results_from_pvp();

-- ── Backfill: battles finished before this migration ─────────────────────────
-- Older computer battles have no recorded outcome; their XP still counts.
insert into public.battle_results (student_id, ref, source, day, xp)
select s.student_id, s.session_id, 'computer',
       (coalesce(s.created_at, now()) at time zone 'Africa/Lagos')::date,
       greatest(coalesce(s.xp_awarded, 0), 0)
from public.practice_sessions s
where s.mode = 'battle' and s.student_id is not null and s.session_id is not null
on conflict (student_id, ref) do nothing;

insert into public.battle_results (student_id, ref, source, day, xp, outcome)
select pl.id, 'pvp-' || m.id::text, 'pvp',
       (coalesce(m.finished_at, now()) at time zone 'Africa/Lagos')::date,
       c.correct * 10 + case r.ch when 'W' then 20 when 'D' then 10 else 0 end,
       case r.ch when 'W' then 'win' when 'D' then 'draw' else 'loss' end
from public.pvp_matches m
cross join lateral (values (m.host_id, 'host', m.host_is_anonymous),
                           (m.guest_id, 'guest', m.guest_is_anonymous)) as pl(id, role, anon)
cross join lateral (
  select count(*)::int as correct from public.pvp_answers a
  where a.match_id = m.id and a.player_id = pl.id and a.is_correct
) c
cross join lateral (
  select case when m.result = 'draw' then 'D' when m.result = pl.role then 'W' else 'L' end as ch
) r
where m.status = 'finished' and pl.id is not null and not coalesce(pl.anon, false)
  and exists (select 1 from public.profiles p where p.id = pl.id)
on conflict (student_id, ref) do nothing;

-- ── Rankings ─────────────────────────────────────────────────────────────────
-- Null p_from / p_to = all time. Ties on XP are broken by wins.
create or replace function public.battle_leaderboard_top(p_from date, p_to date, p_limit integer)
returns table (student_id uuid, xp bigint, battles bigint, wins bigint, rank bigint)
language sql stable
security definer
set search_path = public
as $$
  with agg as (
    select r.student_id, sum(r.xp) as xp, count(*) as battles,
           count(*) filter (where r.outcome = 'win') as wins
    from public.battle_results r
    where (p_from is null or r.day >= p_from) and (p_to is null or r.day <= p_to)
    group by r.student_id
    having sum(r.xp) > 0
  )
  select a.student_id, a.xp::bigint, a.battles::bigint, a.wins::bigint,
         (rank() over (order by a.xp desc, a.wins desc))::bigint
  from agg a
  order by a.xp desc, a.wins desc, a.student_id
  limit greatest(p_limit, 0)
$$;

create or replace function public.battle_leaderboard_me(p_student uuid, p_from date, p_to date)
returns table (xp bigint, battles bigint, wins bigint, rank bigint)
language sql stable
security definer
set search_path = public
as $$
  with mine as (
    select coalesce(sum(r.xp), 0) as xp, count(*) as battles,
           count(*) filter (where r.outcome = 'win') as wins
    from public.battle_results r
    where r.student_id = p_student
      and (p_from is null or r.day >= p_from) and (p_to is null or r.day <= p_to)
  )
  select m.xp::bigint, m.battles::bigint, m.wins::bigint,
         case when m.xp = 0 then null::bigint else 1 + (
           select count(*) from (
             select r.student_id, sum(r.xp) as xp, count(*) filter (where r.outcome = 'win') as wins
             from public.battle_results r
             where (p_from is null or r.day >= p_from) and (p_to is null or r.day <= p_to)
             group by r.student_id
           ) a
           where a.xp > m.xp or (a.xp = m.xp and a.wins > m.wins)
         ) end
  from mine m
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.battle_leaderboard_top(date, date, integer)',
    'public.battle_leaderboard_me(uuid, date, date)',
    'public.record_battle_result(uuid, text, integer, text)',
    'public.battle_results_from_session()',
    'public.battle_results_from_pvp()'
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
    revoke all on public.battle_results from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.battle_results from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.battle_results to service_role;
  end if;
end $$;

commit;
