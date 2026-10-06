-- 20261004_battle_xp.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Battle XP: each student's own battle score, kept on their profile.
-- Run in the Supabase SQL editor AFTER 20261003_battle_leaderboard.sql. Safe to
-- re-run.
--
--   profiles.battle_xp   XP earned in battles (computer and 1v1), all time.
--                        The battle world shows this instead of total_points.
--                        Battle XP still counts towards total_points too: a
--                        battle is a practice session in a different mode.
--
-- It mirrors the battle_results ledger (20261003): a trigger adds each row's
-- XP (or the change in it) to the profile, so it is always the ledger's sum.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.profiles
  add column if not exists battle_xp integer not null default 0;

-- Students can't set it themselves: same as 20260928_pvp_engine.sql, plus
-- battle_xp. A student's own login may edit their profile where RLS allows,
-- but these columns snap back to their old values.
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

create or replace function public.battle_results_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := coalesce(new.xp, 0) - case when tg_op = 'UPDATE' then coalesce(old.xp, 0) else 0 end;
begin
  if delta <> 0 then
    update public.profiles
       set battle_xp = greatest(coalesce(battle_xp, 0) + delta, 0)
     where id = new.student_id;
  end if;
  return new;
exception when others then
  -- Battle XP must never block a session save.
  raise warning 'battle_results_to_profile: %', sqlerrm;
  return new;
end
$$;

drop trigger if exists battle_results_to_profile on public.battle_results;
create trigger battle_results_to_profile
  after insert or update of xp on public.battle_results
  for each row execute function public.battle_results_to_profile();

-- ── Backfill from the ledger ─────────────────────────────────────────────────
update public.profiles p
   set battle_xp = t.xp
  from (select student_id, sum(xp)::int as xp from public.battle_results group by student_id) t
 where p.id = t.student_id and p.battle_xp is distinct from t.xp;

-- ── Grants: server only ──────────────────────────────────────────────────────
revoke execute on function public.battle_results_to_profile() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.battle_results_to_profile() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.battle_results_to_profile() from authenticated;
  end if;
end $$;

commit;
