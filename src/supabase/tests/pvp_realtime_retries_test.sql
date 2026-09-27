-- supabase/tests/pvp_realtime_retries_test.sql
-- Checks for 20260930_pvp_realtime_and_retries.sql. LOCAL POSTGRES ONLY.
-- Run after pvp_engine_test.sql (same setup: shims, migrations, profiles).
-- Expect the last line: ALL PVP REALTIME/RETRY TESTS PASSED
\set ON_ERROR_STOP 1
\set QUIET 1
update app_settings set value = '50' where key = 'pvp_max_live_matches';
create temp table r_ids as select (array_agg(id order by id))[5] h, (array_agg(id order by id))[6] g, (array_agg(id order by id))[7] x from profiles;
grant select on r_ids to authenticated;
create temp table r_match (id uuid, code text);
grant all on r_match to authenticated;
create or replace function pg_temp.act(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', u, 'role', 'authenticated')::text, false) $$;
create or replace function pg_temp.start_round(mid uuid) returns void language sql as $$
  update pvp_matches set round_started_at = now() - interval '1 second', round_deadline = now() + interval '30 seconds' where id = mid $$;

-- a live match between h and g
select pg_temp.act((select h from r_ids));
set role authenticated;
do $$ declare r jsonb; begin
  r := pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,30);
  insert into r_match values ((r->>'match_id')::uuid, r->>'code');
end $$;
reset role;
select pg_temp.act((select g from r_ids));
set role authenticated;
do $$ declare r jsonb; begin
  r := pvp_join((select code from r_match), 'Tobi');
  assert r ->> 'ok' = 'true', 'join: ' || r::text;
  -- the reply was lost; the phone sends the same join again
  r := pvp_join((select code from r_match), 'Tobi');
  assert r ->> 'ok' = 'true' and r ->> 'match_id' = (select id::text from r_match), 'resent join returns the same match: ' || r::text;
end $$;
reset role;
do $$ begin
  assert (select count(*) from pvp_join_failures where user_id = (select g from r_ids)) = 0, 'resent join is not a wrong code';
end $$;

-- ── 1. Realtime: only the two players may use the match channel ─────────────
select set_config('realtime.topic', 'pvp:' || (select id from r_match), false);
select pg_temp.act((select h from r_ids));
set role authenticated;
do $$ begin assert (select count(*) from realtime.messages) > 0, 'host can receive on the match channel'; end $$;
reset role;
select pg_temp.act((select g from r_ids));
set role authenticated;
do $$ begin assert (select count(*) from realtime.messages) > 0, 'guest can receive on the match channel'; end $$;
reset role;
select pg_temp.act((select x from r_ids));
set role authenticated;
do $$ begin
  assert (select count(*) from realtime.messages) = 0, 'a stranger cannot receive';
  begin
    insert into realtime.messages (topic, extension) values ('pvp:' || (select id from r_match), 'presence');
    assert false, 'a stranger cannot send presence';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('realtime.topic', 'pvp:' || gen_random_uuid(), false);
select pg_temp.act((select h from r_ids));
set role authenticated;
do $$ begin assert (select count(*) from realtime.messages) = 0, 'a player cannot use another match''s channel'; end $$;
reset role;
select set_config('realtime.topic', 'lobby', false);
select pg_temp.act((select h from r_ids));
set role authenticated;
do $$ begin assert (select count(*) from realtime.messages) = 0, 'non-pvp topics are not opened by these policies'; end $$;
reset role;

-- ── 2. Answer resends ────────────────────────────────────────────────────────
-- Answers are sent as the player; stored times are read back as the owner
-- (players can't read pvp_answers directly).
create temp table r_t (k text primary key, ms int);
create or replace function pg_temp.answer_as(u uuid, choice int) returns jsonb language plpgsql as $$
declare r jsonb; begin
  perform pg_temp.act(u);
  execute 'set local role authenticated';
  r := pvp_answer((select id from r_match), 0, choice);
  execute 'reset role';
  return r;
end $$;
-- Each answer is its own statement (its own transaction): now() is fixed
-- inside a transaction, so times only differ between statements.
select pg_temp.start_round((select id from r_match));
do $$ declare r jsonb := pg_temp.answer_as((select h from r_ids), 1); begin
  assert r ->> 'ok' = 'true' and r ->> 'changed' = 'false', 'first answer: ' || r::text;
  insert into r_t select 'first', ms_taken from pvp_answers where match_id = (select id from r_match) and q_index = 0;
end $$;
select pg_sleep(0.3);
do $$ declare r jsonb := pg_temp.answer_as((select h from r_ids), 1); begin      -- same choice resent
  assert r ->> 'ok' = 'true' and r ->> 'changed' = 'false', 'resend: ' || r::text;
  assert (select ms_taken from pvp_answers where match_id = (select id from r_match) and q_index = 0)
         = (select ms from r_t where k = 'first'), 'resend keeps the original time';
end $$;
select pg_sleep(0.3);
do $$ declare r jsonb := pg_temp.answer_as((select h from r_ids), 2); begin      -- a real change
  assert r ->> 'changed' = 'true', 'change: ' || r::text;
  assert (select choice from pvp_answers where match_id = (select id from r_match) and q_index = 0) = 2, 'change stored';
  assert (select ms_taken from pvp_answers where match_id = (select id from r_match) and q_index = 0)
         >= (select ms from r_t where k = 'first') + 500, 'a change takes the new time';
end $$;
do $$ begin
  assert (select count(*) from realtime.log where event = 'answered' and topic = 'pvp:' || (select id from r_match)) = 1,
         'the opponent is told once';
end $$;

select 'ALL PVP REALTIME/RETRY TESTS PASSED' as result;
