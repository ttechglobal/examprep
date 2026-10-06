-- check_migration_prerequisites.sql — READ-ONLY, changes nothing.
-- Paste into the Supabase SQL editor. Each row is something a migration
-- creates; "missing" means that migration (the `from` column) hasn't run.
-- Run missing migrations in filename order, oldest first.
with checks(item, present, from_migration) as (values
  ('function app_today()',                    to_regprocedure('public.app_today()') is not null,                              '20260926_scale_hardening.sql'),
  ('function leaderboard_top()',              to_regproc('public.leaderboard_top') is not null,                               '20260926_scale_hardening.sql'),
  ('function save_practice_session()',        to_regproc('public.save_practice_session') is not null,                         '20260926_scale_hardening.sql'),
  ('table student_daily_stats',               to_regclass('public.student_daily_stats') is not null,                          '20260926_scale_hardening.sql'),
  ('practice_sessions.session_id',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'practice_sessions' and column_name = 'session_id'),  '20260926_scale_hardening.sql'),
  ('practice_sessions.mode',                  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'practice_sessions' and column_name = 'mode'),        '20260926_scale_hardening.sql'),
  ('practice_sessions.xp_awarded',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'practice_sessions' and column_name = 'xp_awarded'),  '20260926_scale_hardening.sql'),
  ('practice_sessions.created_at',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'practice_sessions' and column_name = 'created_at'),  'original schema'),
  ('table battle_stats',                      to_regclass('public.battle_stats') is not null,                                 'original schema'),
  ('battle_stats.recent_form',                exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'battle_stats' and column_name = 'recent_form'),      '20260927_battle_recent_form.sql (now also added by 20261003_battle_leaderboard.sql)'),
  ('table pvp_matches',                       to_regclass('public.pvp_matches') is not null,                                  '20260928_pvp_engine.sql'),
  ('pvp_matches.host_is_anonymous',           exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pvp_matches' and column_name = 'host_is_anonymous'), '20260928_pvp_engine.sql'),
  ('table pvp_answers',                       to_regclass('public.pvp_answers') is not null,                                  '20260928_pvp_engine.sql'),
  ('function get_practice_questions()',       to_regproc('public.get_practice_questions') is not null,                        '20260926_scale_hardening.sql'),
  ('table battle_results',                    to_regclass('public.battle_results') is not null,                               '20261003_battle_leaderboard.sql'),
  ('profiles.battle_xp',                      exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'battle_xp'),            '20261004_battle_xp.sql')
)
select item, case when present then 'ok' else 'MISSING' end as status, from_migration
from checks
order by present, from_migration, item;
