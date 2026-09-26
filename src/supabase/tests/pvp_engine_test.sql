-- supabase/tests/pvp_engine_test.sql
-- Scripted 1v1 matches against the engine (20260928_pvp_engine.sql).
-- LOCAL POSTGRES ONLY — it deletes pvp_* rows and changes app_settings.
-- Run: psql -d <local db> -f local_supabase_shims.sql, then the migrations,
-- then: psql -d <local db> -f pvp_engine_test.sql
-- Expect the last line: ALL PVP ENGINE TESTS PASSED
\set ON_ERROR_STOP 1
\set QUIET 1
-- ── setup (superuser) ─────────────────────────────────────────────────────
delete from pvp_matches; delete from pvp_stats; delete from pvp_join_failures; delete from realtime.log;
update app_settings set value = '5' where key = 'pvp_max_live_matches';
create temp table t_ids as select (array_agg(id order by id))[1] h, (array_agg(id order by id))[2] g, (array_agg(id order by id))[3] x from profiles;
grant select on t_ids to authenticated, anon;
create or replace function pg_temp.act(u uuid, anon boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', u, 'role', 'authenticated', 'is_anonymous', anon)::text, false) $$;
-- time travel: pretend the current round started p_secs ago
create or replace function pg_temp.age_round(mid uuid, secs int) returns void language sql as $$
  update pvp_matches set round_started_at = round_started_at - make_interval(secs => secs),
                         round_deadline   = round_deadline   - make_interval(secs => secs) where id = mid $$;
create temp table t_match (k text primary key, id uuid, code text);
grant all on t_match to authenticated, anon;
select (select h from t_ids) as h_before_xp, (select total_points from profiles where id=(select h from t_ids)) as xp_h,
       (select total_points from profiles where id=(select g from t_ids)) as xp_g \gset

-- ── 1. access rules ───────────────────────────────────────────────────────
select pg_temp.act((select h from t_ids), true);
set role authenticated;
do $$ begin
  assert (select pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,30)) ->> 'error' = 'PVP_ACCOUNT_REQUIRED', 'guest login cannot create';
end $$;
reset role;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ begin
  assert (select pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,7,30)) ->> 'error' = 'PVP_BAD_SETTINGS', 'bad count';
  assert (select pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,90)) ->> 'error' = 'PVP_BAD_SETTINGS', 'bad timer';
end $$;
-- privileges: internal functions not callable by players
do $$ begin
  begin perform pvp_sweep(); assert false, 'sweep should be denied'; exception when insufficient_privilege then null; end;
  begin perform pvp_close_round(gen_random_uuid()); assert false, 'close_round denied'; exception when insufficient_privilege then null; end;
  begin perform pvp_finish(gen_random_uuid(),'x'); assert false, 'finish denied'; exception when insufficient_privilege then null; end;
  begin perform 1 from pvp_matches; assert false, 'table read denied'; exception when insufficient_privilege then null; end;
end $$;

-- ── 2. create + preview + join ────────────────────────────────────────────
do $$ declare r jsonb; begin
  r := pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,30);
  assert r ->> 'ok' = 'true', 'create ok: ' || r::text;
  assert (r ->> 'code') ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$', 'code format ' || (r->>'code');
  insert into t_match values ('m1', (r->>'match_id')::uuid, r->>'code');
end $$;
reset role;
set role anon;
do $$ begin
  assert (select pvp_preview(lower((select code from t_match where k='m1')))) ->> 'status' = 'waiting', 'anon can preview (case-insensitive)';
  assert (select pvp_preview('ZZZZ')) ->> 'error' = 'PVP_CODE_NOT_FOUND', 'preview unknown';
end $$;
reset role;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ begin
  assert (select pvp_join((select code from t_match where k='m1'))) ->> 'error' = 'PVP_OWN_BATTLE', 'cannot join own';
  -- state before join: waiting, no question
  assert (select pvp_state((select id from t_match where k='m1'))) -> 'match' ->> 'status' = 'waiting';
end $$;
reset role;
select pg_temp.act((select g from t_ids), true);   -- friend plays as a guest login
set role authenticated;
do $$ declare r jsonb; begin
  r := pvp_join((select code from t_match where k='m1'), 'Ada');
  assert r ->> 'ok' = 'true', 'guest joins: ' || r::text;
  r := pvp_state((select id from t_match where k='m1'));
  assert r ->> 'me' = 'guest' and r -> 'guest' ->> 'name' = 'Ada', 'names';
  assert r -> 'current' = 'null'::jsonb, 'no question during countdown';
  assert (select pvp_answer((select id from t_match where k='m1'), 0, 1)) ->> 'error' = 'PVP_ROUND_NOT_STARTED', 'cannot answer in countdown';
end $$;
reset role;
select pg_temp.age_round((select id from t_match where k='m1'), 5);  -- countdown over, 1s into round 1

-- ── 3. round 1: host answers, changes answer, guest answers → reveal ─────
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ declare r jsonb; m uuid := (select id from t_match where k='m1'); begin
  r := pvp_state(m);
  assert r -> 'current' ->> 'q_index' = '0', 'round 1 visible';
  assert not (r -> 'current' ? 'correct_answer') and not (r::text like '%correct_index%'), 'no answer leaked while open';
  assert pvp_answer(m, 0, 0) ->> 'changed' = 'false';
  assert pvp_answer(m, 0, 1) ->> 'changed' = 'true', 'answer changed';
  assert pvp_answer(m, 1, 1) ->> 'error' = 'PVP_WRONG_ROUND';
  assert pvp_answer(m, 0, 9) ->> 'error' = 'PVP_BAD_CHOICE';
end $$;
reset role;
do $$ begin
  assert (select count(*) from realtime.log where event='answered') = 1, 'answered broadcast once, not on change';
  assert not exists (select 1 from realtime.log where event='answered' and payload ? 'choice'), 'answered signal has no choice';
end $$;
select pg_temp.act((select g from t_ids), true);
set role authenticated;
do $$ declare r jsonb; m uuid := (select id from t_match where k='m1'); begin
  assert pvp_state(m) -> 'current' ->> 'opponent_answered' = 'true';
  r := pvp_answer(m, 0, 2);   -- wrong
  assert r ->> 'round_closed' = 'true', 'both answered closes round';
  r := pvp_state(m);
  assert r -> 'current' = 'null'::jsonb, 'reveal pause: next question hidden';
  assert jsonb_array_length(r -> 'rounds') = 1 and (r -> 'rounds' -> 0 ->> 'correct_index') = '1', 'reveal shows correct index';
  assert (r -> 'rounds' -> 0 -> 'theirs' ->> 'correct') = 'true' and (r -> 'rounds' -> 0 -> 'mine' ->> 'points') = '0';
  assert (r -> 'host' ->> 'points')::int between 10 and 15, 'host scored 10+speed';
end $$;
reset role;

-- ── 4. round 2: nobody answers → timeout via tick; late answer rejected ──
select pg_temp.age_round((select id from t_match where k='m1'), 3 + 33);   -- past deadline (30s + 2s grace)
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ declare r jsonb; m uuid := (select id from t_match where k='m1'); begin
  r := pvp_answer(m, 1, 1);
  assert r ->> 'error' = 'PVP_TIME_UP', 'late answer rejected';
  r := pvp_state(m);
  assert (r -> 'match' ->> 'rounds_closed')::int = 2, 'late answer closed the round';
  assert (r -> 'rounds' -> 1 -> 'mine') = 'null'::jsonb, 'no answer recorded';
  r := pvp_tick(m);   -- nothing due yet
  assert (r -> 'match' ->> 'rounds_closed')::int = 2, 'tick is idempotent';
end $$;
reset role;

-- ── 5. rounds 3-5: host fast+correct, guest slower+correct ──────────────
do $$ declare m uuid := (select id from t_match where k='m1'); i int; begin
  for i in 2..4 loop
    perform pg_temp.age_round(m, 3 + 2);   -- next round now 2s in
    perform pg_temp.act((select h from t_ids));
    execute 'set local role authenticated';
    assert pvp_answer(m, i, 1) ->> 'ok' = 'true';
    execute 'reset role';
    perform pg_temp.age_round(m, 10);      -- guest answers ~12s in
    perform pg_temp.act((select g from t_ids), true);
    execute 'set local role authenticated';
    assert pvp_answer(m, i, 1) ->> 'round_closed' = 'true';
    execute 'reset role';
  end loop;
end $$;
do $$ declare m pvp_matches; begin
  select * into m from pvp_matches where id = (select id from t_match where k='m1');
  assert m.status = 'finished' and m.result = 'host', 'host wins: ' || m.status || ' ' || coalesce(m.result,'-');
  assert m.host_points > m.guest_points;
  assert (select count(*) from realtime.log where event='finished') = 1;
  -- host answered 4 rounds; the guest login's answers stay out of question_attempts
  assert (select count(*) from question_attempts where session_id = 'pvp-' || m.id) = 4, 'attempts recorded: ' || (select count(*) from question_attempts where session_id = 'pvp-' || m.id);
  assert not exists (select 1 from question_attempts where session_id = 'pvp-' || m.id and student_id = m.guest_id), 'no guest attempts';
  assert m.guest_is_anonymous and not m.host_is_anonymous, 'guest login flagged';
  assert (select recent_form from pvp_stats where student_id = m.host_id) = 'W';
  assert (select recent_form from pvp_stats where student_id = m.guest_id) = 'L';
end $$;
select set_config('t.host_gain',  ((select total_points from profiles where id=(select h from t_ids)) - :xp_h)::text, false),
       set_config('t.guest_gain', ((select total_points from profiles where id=(select g from t_ids)) - :xp_g)::text, false) \gset
do $$ begin
  assert current_setting('t.host_gain')::int = 60, 'host XP: 4 correct x 10 + 20 win, got ' || current_setting('t.host_gain');
  assert current_setting('t.guest_gain')::int = 0, 'guest login earns no XP, got ' || current_setting('t.guest_gain');
end $$;
select event, count(*) from realtime.log group by 1 order by 1;

-- ── 6. rematch: new match, only the opponent may join, old match untouched ─
select pg_temp.act((select g from t_ids), true);   -- the guest asks for the rematch
set role authenticated;
do $$ declare r jsonb; begin
  r := pvp_rematch((select id from t_match where k='m1'));
  assert r ->> 'ok' = 'true', 'guest can request a rematch: ' || r::text;
  insert into t_match values ('m2', (r->>'match_id')::uuid, r->>'code');
  assert r ->> 'joined' = 'false';
  r := pvp_rematch((select id from t_match where k='m1'));
  assert r ->> 'match_id' = (select id::text from t_match where k='m2'), 'asking twice returns the same rematch';
  r := pvp_state((select id from t_match where k='m1')) -> 'rematch';
  assert r ->> 'mine' = 'true' and r ->> 'status' = 'waiting', 'requester sees their rematch: ' || coalesce(r::text, 'null');
end $$;
reset role;
select pg_temp.act((select x from t_ids));
set role authenticated;
do $$ begin assert pvp_join((select code from t_match where k='m2')) ->> 'error' = 'PVP_NOT_INVITED', 'stranger cannot take a rematch'; end $$;
reset role;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ declare r jsonb; begin
  r := pvp_state((select id from t_match where k='m1')) -> 'rematch';
  assert r ->> 'mine' = 'false' and r ->> 'code' = (select code from t_match where k='m2'), 'opponent sees the rematch offer';
  -- pressing Rematch too accepts the existing offer instead of opening a second match
  r := pvp_rematch((select id from t_match where k='m1'));
  assert r ->> 'ok' = 'true' and r ->> 'joined' = 'true' and r ->> 'match_id' = (select id::text from t_match where k='m2'), 'invited host joins rematch: ' || r::text;
  r := pvp_state((select id from t_match where k='m2'));
  assert r ->> 'me' = 'guest' and r -> 'host' ->> 'name' = 'Ada', 'rematch keeps guest name';
end $$;
reset role;
do $$ begin
  assert (select status from pvp_matches where id = (select id from t_match where k='m1')) = 'finished', 'original untouched';
  assert (select count(*) from pvp_matches where rematch_of = (select id from t_match where k='m1')) = 1, 'one rematch only';
  assert exists (select 1 from realtime.log where event = 'rematch' and topic = 'pvp:' || (select id from t_match where k='m1')), 'rematch signalled on old channel';
end $$;

-- ── 7. forfeit ───────────────────────────────────────────────────────────
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ begin assert pvp_leave((select id from t_match where k='m2')) ->> 'ok' = 'true'; end $$;
reset role;
do $$ declare m pvp_matches; begin
  select * into m from pvp_matches where id = (select id from t_match where k='m2');
  assert m.status = 'finished' and m.finish_reason = 'forfeit' and m.winner_id = m.host_id, 'leaver loses (host of m2 is the old guest)';
  assert (select recent_form from pvp_stats where student_id = (select h from t_ids)) = 'LW', 'form newest first';
end $$;

-- ── 8. cap: 5 live battles, 6th refused ─────────────────────────────────
do $$ declare u uuid; r jsonb; n int := 0; begin
  for u in select id from profiles order by id offset 10 limit 6 loop
    perform pg_temp.act(u);
    execute 'set local role authenticated';
    r := pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,15);
    execute 'reset role';
    if r ->> 'ok' = 'true' then n := n + 1; else assert r ->> 'error' = 'PVP_FULL', r::text; end if;
  end loop;
  assert n = 5, 'exactly 5 created, got ' || n;
end $$;
-- same host creating again replaces their own open battle (count stays 5)
do $$ declare u uuid := (select id from profiles order by id offset 10 limit 1); r jsonb; begin
  perform pg_temp.act(u);
  execute 'set local role authenticated';
  r := pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,15);
  execute 'reset role';
  assert r ->> 'ok' = 'true', 'host can replace own battle at cap';
  assert (select count(*) from pvp_matches where status in ('waiting','in_progress')) = 5;
end $$;

-- ── 9. wrong-code rate limit ─────────────────────────────────────────────
select pg_temp.act((select x from t_ids));
set role authenticated;
do $$ declare i int; r jsonb; begin
  for i in 1..5 loop assert pvp_join('QQQQ') ->> 'error' = 'PVP_CODE_NOT_FOUND'; end loop;
  assert pvp_join('QQQQ') ->> 'error' = 'PVP_TOO_MANY_ATTEMPTS', 'rate limited after 5 misses';
end $$;
reset role;

-- ── 10. expiry and abandonment via sweep ─────────────────────────────────
update pvp_matches set expires_at = now() - interval '1 minute' where status = 'waiting';
insert into t_match select 'm3', id, code from pvp_matches where status='waiting' limit 1;
select pvp_sweep() as sweep1;
do $$ begin
  assert (select count(*) from pvp_matches where status='waiting') = 0, 'waiting battles expired';
  assert (select pvp_preview((select code from t_match where k='m3'))) ->> 'status' = 'expired';
end $$;
-- a live match nobody touches for >2 minutes past its deadline is abandoned
update app_settings set value = '5' where key = 'pvp_max_live_matches';
select pg_temp.act((select x from t_ids));
set role authenticated;
do $$ declare r jsonb; begin r := pvp_create('JAMB','11111111-1111-1111-1111-111111111111',null,5,10); insert into t_match values ('m4',(r->>'match_id')::uuid, r->>'code'); end $$;
reset role;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ begin assert pvp_join((select code from t_match where k='m4')) ->> 'ok' = 'true'; end $$;
reset role;
select pg_temp.age_round((select id from t_match where k='m4'), 4 + 12 + 125);
select pvp_sweep() as sweep2;
do $$ begin
  assert (select status from pvp_matches where id = (select id from t_match where k='m4')) = 'abandoned', 'dead match abandoned';
  assert (select count(*) from pvp_stats where student_id = (select x from t_ids)) = 0, 'abandoned match changes no stats';
end $$;
-- ── 11. guest signs up: their battles move onto the new account ─────────
create temp table t_new as select id from profiles order by id offset 30 limit 1;
grant select on t_new to authenticated;
select set_config('t.xp_new', coalesce((select total_points from profiles where id = (select id from t_new)), 0)::text, false) \gset
select pg_temp.act((select id from t_new));
set role authenticated;
do $$ begin
  begin perform merge_battle_guest((select g from t_ids), (select id from t_new)); assert false, 'merge must be server-only';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare r jsonb; n uuid := (select id from t_new); g uuid := (select g from t_ids); begin
  r := merge_battle_guest(g, n);
  -- m1: lost with 3 correct = 30; m2: won by forfeit, 0 answered = 20
  assert r = '{"matches": 2, "xp": 50}'::jsonb, 'merge result: ' || r::text;
  assert (select count(*) from question_attempts where student_id = n and session_id = 'pvp-' || (select id from t_match where k='m1')) = 4, 'guest answers become attempts';
  assert (select count(*) from question_attempts qa
          where qa.student_id = n and qa.session_id = 'pvp-' || (select id from t_match where k='m1')
            and qa.created_at in (select answered_at from pvp_answers
                                  where match_id = (select id from t_match where k='m1') and player_id = n)) = 4,
         'attempts dated when answered';
  assert (select guest_id from pvp_matches where id = (select id from t_match where k='m1')) = n, 'match reassigned';
  assert (select winner_id from pvp_matches where id = (select id from t_match where k='m2')) = n, 'win reassigned';
  assert not exists (select 1 from pvp_matches where g in (host_id, guest_id)), 'no match left on the guest login';
  assert (select played || recent_form from pvp_stats where student_id = n) = '2WL', 'stats merged';
  assert not exists (select 1 from pvp_stats where student_id = g), 'guest stats removed';
  assert merge_battle_guest(g, n) = '{"matches": 0, "xp": 0}'::jsonb, 'second claim is a no-op';
end $$;
do $$ begin
  assert (select total_points from profiles where id = (select id from t_new)) - current_setting('t.xp_new')::int = 50, 'XP credited once';
end $$;

-- ── 12. opponent away: the player who stayed can claim the win ──────────
select pg_temp.act((select x from t_ids));
set role authenticated;
do $$ declare r jsonb; begin r := pvp_create('WAEC','11111111-1111-1111-1111-111111111111',null,5,10); insert into t_match values ('m5',(r->>'match_id')::uuid, r->>'code'); end $$;
reset role;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ begin assert pvp_join((select code from t_match where k='m5')) ->> 'ok' = 'true'; end $$;
reset role;
do $$ declare m uuid := (select id from t_match where k='m5'); i int; begin
  for i in 0..2 loop
    perform pg_temp.age_round(m, 4);                 -- 1s into round i
    perform pg_temp.act((select x from t_ids));
    execute 'set local role authenticated';
    if i = 0 then assert pvp_answer(m, 0, 1) ->> 'ok' = 'true'; end if;
    if i = 1 then
      assert pvp_state(m) ->> 'opponent_away' = 'false', 'not away after 1 round';
      assert pvp_claim_win(m) ->> 'error' = 'PVP_NOT_ALLOWED', 'too early to claim';
    end if;
    execute 'reset role';
    perform pg_temp.age_round(m, 15);                -- past the 10s + 2s deadline
    perform pg_temp.act((select x from t_ids));
    execute 'set local role authenticated';
    perform pvp_tick(m);
    execute 'reset role';
  end loop;
end $$;
select pg_temp.act((select h from t_ids));
set role authenticated;
do $$ declare m uuid := (select id from t_match where k='m5'); begin
  assert pvp_state(m) ->> 'opponent_away' = 'false', 'the absent player is never offered the win';
  assert pvp_claim_win(m) ->> 'error' = 'PVP_NOT_ALLOWED';
end $$;
reset role;
select pg_temp.act((select x from t_ids));
set role authenticated;
do $$ declare m uuid := (select id from t_match where k='m5'); begin
  assert pvp_state(m) ->> 'opponent_away' = 'true', 'away after 3 missed rounds';
  assert pvp_claim_win(m) ->> 'ok' = 'true';
  assert pvp_claim_win(m) ->> 'error' = 'PVP_NOT_IN_PROGRESS', 'claim once';
end $$;
reset role;
do $$ declare m pvp_matches; begin
  select * into m from pvp_matches where id = (select id from t_match where k='m5');
  assert m.status = 'finished' and m.finish_reason = 'opponent_away' and m.winner_id = (select x from t_ids), 'claimed win recorded';
end $$;

select 'ALL PVP ENGINE TESTS PASSED' as result;
