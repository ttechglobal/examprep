-- 20260927_battle_recent_form.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Battle recent form (W/D/L strip on the battle page).
-- Run in the Supabase SQL editor AFTER 20260926_scale_hardening.sql and BEFORE
-- deploying the app code that goes with it. Safe to re-run.
--
--   battle_stats.recent_form      last 10 results, newest first, e.g. 'WWLDW'
--   battle_stats.last_session_id  makes record_battle_result idempotent: a
--                                 retried POST for the same match is ignored
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.battle_stats add column if not exists recent_form     text not null default '';
alter table public.battle_stats add column if not exists last_session_id text;

-- Replace the 3-argument version from 20260926 with one that takes the match id.
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

revoke execute on function public.record_battle_result(uuid, text, integer, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.record_battle_result(uuid, text, integer, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.record_battle_result(uuid, text, integer, text) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_battle_result(uuid, text, integer, text) to service_role;
  end if;
end $$;

commit;
