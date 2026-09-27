-- 20260929_fix_attempts_session_id.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Fixes two mismatches between the live question_attempts table and the code
-- that writes to it. Run in the Supabase SQL editor. Safe to re-run.
--
-- 1. session_id is uuid on the live table, but every writer stores text:
--      practice/mock sessions  save_practice_session  → the session id as text
--                              (older app versions:  'legacy-<hash>')
--      1v1 battles             pvp_finish / merge_battle_guest → 'pvp-<match id>'
--    20260926 meant to add it as text, but "add column if not exists" skipped
--    it because a uuid column was already there. Every one of those inserts
--    fails with "column session_id is of type uuid but expression is of type
--    text". For 1v1 that failure undoes the last answer, so every match
--    freezes on its final question. Converting to text keeps every existing
--    value (a uuid becomes the same characters as text).
--
-- 2. The context check allows only diagnostic / lesson / practice / exam.
--    1v1 answers are saved with context 'pvp', so they are added to the list.
--
-- practice_sessions.session_id gets the same treatment if it is also uuid.
--
-- Converting the column rewrites question_attempts and briefly blocks writes
-- to it; on a large table run this at a quiet time.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'question_attempts' and column_name = 'session_id') = 'uuid' then
    alter table public.question_attempts alter column session_id type text using session_id::text;
    raise notice 'question_attempts.session_id converted uuid → text';
  end if;

  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'practice_sessions' and column_name = 'session_id') = 'uuid' then
    alter table public.practice_sessions alter column session_id type text using session_id::text;
    raise notice 'practice_sessions.session_id converted uuid → text';
  end if;
end
$$;

alter table public.question_attempts drop constraint if exists question_attempts_context_check;
alter table public.question_attempts add constraint question_attempts_context_check
  check (context = any (array['diagnostic', 'lesson', 'practice', 'exam', 'pvp']));

commit;

-- Check: both lines should say 'text'.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and column_name = 'session_id'
  and table_name in ('question_attempts', 'practice_sessions');
