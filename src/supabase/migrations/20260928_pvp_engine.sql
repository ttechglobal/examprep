-- 20260928_pvp_engine.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1v1 battles (Player vs Player) — the match engine. Phase 1 of the 1v1 Battle
-- Design doc. Run after 20260927_battle_recent_form.sql. Safe to re-run.
--
-- The database is the referee: it picks the questions, keeps answers secret
-- until a round closes, timestamps every answer, scores, and decides the
-- winner. Phones call the pvp_* functions below with their own login and
-- only ever display what the database says.
--
-- Access: any signed-in student with a full account can create a battle;
-- anyone signed in (guest logins included) can join with a code. The app
-- keeps 1v1 hidden by leaving its button disabled until launch.
-- Change the number of simultaneous battles (default 5):
--   update public.app_settings set value = '5' where key = 'pvp_max_live_matches';
--
-- Expected problems come back as { ok: false, error: 'PVP_…' } rather than
-- exceptions, so screens can show a friendly message:
--   PVP_AUTH_REQUIRED, PVP_ACCOUNT_REQUIRED, PVP_FULL,
--   PVP_BAD_SETTINGS, PVP_NOT_ENOUGH_QUESTIONS, PVP_CODE_NOT_FOUND,
--   PVP_EXPIRED, PVP_OWN_BATTLE, PVP_NOT_INVITED, PVP_TOO_MANY_ATTEMPTS,
--   PVP_NOT_A_PLAYER, PVP_NOT_IN_PROGRESS, PVP_WRONG_ROUND,
--   PVP_ROUND_NOT_STARTED, PVP_TIME_UP, PVP_BAD_CHOICE, PVP_NOT_ALLOWED
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Settings ─────────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values
  ('pvp_max_live_matches', '5')
on conflict (key) do nothing;
-- Settings from an earlier draft of this migration.
delete from public.app_settings where key in ('pvp_enabled', 'pvp_allowlist');

create or replace function public.app_setting(p_key text)
returns jsonb
language sql stable
security definer
set search_path = public
as $$ select value from public.app_settings where key = p_key $$;

-- ── Profile protection fix (also in 20260926) ────────────────────────────────
-- The first version keyed on the request's JWT role, which blocked XP awarded
-- by our own functions when a player's login called them. It now checks
-- current_user, which is the function owner inside security-definer code.
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

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.pvp_matches (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  status           text not null default 'waiting'
                   check (status in ('waiting', 'in_progress', 'finished', 'expired', 'cancelled', 'abandoned')),
  host_id          uuid not null,
  guest_id         uuid,
  invited_id       uuid,                      -- rematches: only this player may join
  host_name        text,
  guest_name       text,
  exam             text not null,
  subject_id       uuid not null,
  subject_name     text,
  topic_id         uuid,
  topic_name       text,
  question_ids     uuid[] not null,
  question_count   integer not null,
  timer_secs       integer not null check (timer_secs between 10 and 60),
  current_index    integer not null default 0,
  rounds_closed    integer not null default 0,
  round_started_at timestamptz,
  round_deadline   timestamptz,
  host_points      integer not null default 0,
  guest_points     integer not null default 0,
  host_ms          integer not null default 0,  -- total time on correct answers (tie-break)
  guest_ms         integer not null default 0,
  result           text check (result in ('host', 'guest', 'draw')),
  winner_id        uuid,
  finish_reason    text,                      -- completed | forfeit
  rematch_of       uuid references public.pvp_matches(id) on delete set null,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz,
  last_activity_at timestamptz not null default now()
);

-- A code is unique only among battles still open.
create unique index if not exists pvp_matches_open_code_key
  on public.pvp_matches (code) where status in ('waiting', 'in_progress');
create index if not exists pvp_matches_live_idx
  on public.pvp_matches (status) where status in ('waiting', 'in_progress');
create index if not exists pvp_matches_host_idx  on public.pvp_matches (host_id, status);
create index if not exists pvp_matches_guest_idx on public.pvp_matches (guest_id, status);

create table if not exists public.pvp_answers (
  match_id    uuid not null references public.pvp_matches(id) on delete cascade,
  player_id   uuid not null,
  q_index     integer not null,
  choice      integer not null,
  answered_at timestamptz not null default now(),
  ms_taken    integer not null,
  is_correct  boolean,          -- set when the round closes
  points      integer,          -- set when the round closes
  primary key (match_id, player_id, q_index)
);

create table if not exists public.pvp_stats (
  student_id     uuid primary key,
  played         integer not null default 0,
  won            integer not null default 0,
  drawn          integer not null default 0,
  lost           integer not null default 0,
  recent_form    text not null default '',     -- last 10, newest first: 'WWLDW'
  last_match_at  timestamptz
);

create table if not exists public.pvp_join_failures (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index if not exists pvp_join_failures_idx on public.pvp_join_failures (user_id, at);

-- Phones never touch these tables directly — only through the functions below.
alter table public.pvp_matches       enable row level security;
alter table public.pvp_answers       enable row level security;
alter table public.pvp_stats         enable row level security;
alter table public.pvp_join_failures enable row level security;

-- ── Small helpers ────────────────────────────────────────────────────────────
create or replace function public.pvp_is_anonymous()
returns boolean
language sql stable
as $$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) $$;

-- Same rule as lib/answers.js checkCorrect: the option at that index equals the
-- stored answer, or the option's letter does.
create or replace function public.pvp_is_correct(p_options jsonb, p_choice integer, p_correct text)
returns boolean
language sql immutable
as $$
  select case
    when p_choice is null or p_choice < 0 or p_choice > 4 then false
    else coalesce(
           case jsonb_typeof(p_options)
             when 'array'  then p_options ->> p_choice
             when 'object' then p_options ->> (array['A','B','C','D','E'])[p_choice + 1]
           end = p_correct, false)
         or (array['A','B','C','D','E'])[p_choice + 1] = p_correct
  end
$$;

create or replace function public.pvp_option_count(p_options jsonb)
returns integer
language sql immutable
as $$
  select case jsonb_typeof(p_options)
    when 'array'  then jsonb_array_length(p_options)
    when 'object' then (select count(*)::int from unnest(array['A','B','C','D','E']) l where p_options ? l)
    else 0
  end
$$;

create or replace function public.pvp_correct_index(p_options jsonb, p_correct text)
returns integer
language sql immutable
as $$
  select min(i) from generate_series(0, greatest(public.pvp_option_count(p_options) - 1, 0)) i
  where public.pvp_is_correct(p_options, i, p_correct)
$$;

create or replace function public.pvp_first_name(p_user uuid)
returns text
language sql stable
security definer
set search_path = public
as $$
  select nullif(split_part(trim(coalesce(full_name, '')), ' ', 1), '')
  from public.profiles where id = p_user
$$;

-- 4 characters from 31 symbols with no look-alikes (no 0/O, 1/I/L).
create or replace function public.pvp_new_code()
returns text
language sql volatile
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 4)
$$;

-- (Plan / trial checks for creating battles go in pvp_create when the
-- free-vs-paid rules exist.)
drop function if exists public.pvp_can_create(uuid);

create or replace function public.pvp_role(m public.pvp_matches, p_user uuid)
returns text
language sql immutable
as $$
  select case when p_user = m.host_id then 'host' when p_user = m.guest_id then 'guest' end
$$;

create or replace function public.pvp_err(p_code text)
returns jsonb
language sql immutable
as $$ select jsonb_build_object('ok', false, 'error', p_code) $$;

-- Realtime signal to both players on the match's private channel. The game
-- state lives in the tables, so a failed signal never breaks a match: phones
-- also re-read pvp_state (on reconnect, and by polling if Realtime is down).
create or replace function public.pvp_broadcast(p_match uuid, p_event text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(p_payload || jsonb_build_object('server_now', now()), p_event, 'pvp:' || p_match::text, true);
exception when others then
  raise warning 'pvp_broadcast(%) failed: %', p_event, sqlerrm;
end
$$;

-- XP + streak for one student's activity. Same streak rule as
-- save_practice_session (practise today or yesterday keeps the streak).
create or replace function public.credit_student_activity(p_student uuid, p_xp integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set total_points     = coalesce(total_points, 0) + greatest(p_xp, 0),
      streak_days      = case
                           when last_active_date = public.app_today()     then greatest(coalesce(streak_days, 0), 1)
                           when last_active_date = public.app_today() - 1 then coalesce(streak_days, 0) + 1
                           else 1
                         end,
      last_active_date = public.app_today()
  where id = p_student
$$;

-- ── Finishing a match ────────────────────────────────────────────────────────
-- Decides the result, copies answers into question_attempts (so leaderboards,
-- progress and streaks include 1v1), awards XP and updates 1v1 stats.
-- XP mirrors the battle formula in lib/xp.js: correct × 10, +20 win, +10 draw.
create or replace function public.pvp_finish(p_match uuid, p_reason text, p_forfeiter uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m        public.pvp_matches;
  v_result text;
  p        record;
  v_char   text;
  v_xp     integer;
begin
  select * into m from public.pvp_matches where id = p_match;

  if p_forfeiter is not null then
    v_result := case when p_forfeiter = m.host_id then 'guest' else 'host' end;
  elsif m.host_points <> m.guest_points then
    v_result := case when m.host_points > m.guest_points then 'host' else 'guest' end;
  elsif m.host_ms <> m.guest_ms then
    v_result := case when m.host_ms < m.guest_ms then 'host' else 'guest' end;
  else
    v_result := 'draw';
  end if;

  update public.pvp_matches
  set status        = 'finished',
      result        = v_result,
      winner_id     = case v_result when 'host' then m.host_id when 'guest' then m.guest_id end,
      finish_reason = p_reason,
      finished_at   = now(),
      last_activity_at = now()
  where id = p_match;

  -- Answers → question_attempts (players with a profile row only).
  insert into public.question_attempts
    (student_id, question_id, is_correct, context, topic_id, subject_id, subject_name, exam_type, session_id)
  select a.player_id, q.id, coalesce(a.is_correct, false), 'pvp', q.topic_id, q.subject_id,
         m.subject_name, m.exam, 'pvp-' || m.id::text
  from public.pvp_answers a
  join public.questions q on q.id = m.question_ids[a.q_index + 1]
  join public.profiles pr on pr.id = a.player_id
  where a.match_id = p_match and a.is_correct is not null;

  for p in
    select pl.id, pl.role,
           (select count(*) from public.pvp_answers a
             where a.match_id = p_match and a.player_id = pl.id and a.is_correct) as correct
    from (values (m.host_id, 'host'), (m.guest_id, 'guest')) as pl(id, role)
    where pl.id is not null
  loop
    v_char := case when v_result = 'draw' then 'D' when v_result = p.role then 'W' else 'L' end;
    v_xp   := p.correct * 10 + case v_char when 'W' then 20 when 'D' then 10 else 0 end;
    perform public.credit_student_activity(p.id, v_xp);

    insert into public.pvp_stats as s (student_id, played, won, drawn, lost, recent_form, last_match_at)
    values (p.id, 1, (v_char = 'W')::int, (v_char = 'D')::int, (v_char = 'L')::int, v_char, now())
    on conflict (student_id) do update set
      played        = s.played + 1,
      won           = s.won   + (v_char = 'W')::int,
      drawn         = s.drawn + (v_char = 'D')::int,
      lost          = s.lost  + (v_char = 'L')::int,
      recent_form   = left(v_char || s.recent_form, 10),
      last_match_at = now();
  end loop;

  perform public.pvp_broadcast(p_match, 'finished', jsonb_build_object(
    'result', v_result, 'reason', p_reason,
    'host_points', m.host_points, 'guest_points', m.guest_points));
end
$$;

-- ── Closing a round ──────────────────────────────────────────────────────────
-- Scores the current round (10 per correct + up to 5 for speed), reveals it to
-- both players, then either finishes the match or schedules the next round
-- 3 seconds later. Caller must hold the row lock.
create or replace function public.pvp_close_round(p_match uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m        public.pvp_matches;
  q        record;
  v_timer  integer;
  h        public.pvp_answers;
  g        public.pvp_answers;
  v_next   timestamptz;
  v_last   boolean;
begin
  select * into m from public.pvp_matches where id = p_match;
  if m.status <> 'in_progress' then return; end if;

  select id, options, correct_answer into q from public.questions where id = m.question_ids[m.current_index + 1];
  v_timer := m.timer_secs * 1000;

  update public.pvp_answers a
  set is_correct = public.pvp_is_correct(q.options, a.choice, q.correct_answer),
      points     = case when public.pvp_is_correct(q.options, a.choice, q.correct_answer)
                        then 10 + round(5 * greatest(0, least(1, 1 - a.ms_taken::numeric / v_timer)))::int
                        else 0 end
  where a.match_id = p_match and a.q_index = m.current_index;

  select * into h from public.pvp_answers where match_id = p_match and q_index = m.current_index and player_id = m.host_id;
  select * into g from public.pvp_answers where match_id = p_match and q_index = m.current_index and player_id = m.guest_id;

  v_last := m.current_index >= m.question_count - 1;
  v_next := now() + interval '3 seconds';

  update public.pvp_matches
  set host_points      = host_points  + coalesce(h.points, 0),
      guest_points     = guest_points + coalesce(g.points, 0),
      host_ms          = host_ms  + case when h.is_correct then h.ms_taken else 0 end,
      guest_ms         = guest_ms + case when g.is_correct then g.ms_taken else 0 end,
      rounds_closed    = rounds_closed + 1,
      current_index    = case when v_last then current_index else current_index + 1 end,
      round_started_at = case when v_last then round_started_at else v_next end,
      round_deadline   = case when v_last then round_deadline
                              else v_next + make_interval(secs => timer_secs + 2) end,
      last_activity_at = now()
  where id = p_match
  returning * into m;

  perform public.pvp_broadcast(p_match, 'reveal', jsonb_build_object(
    'q_index',       m.rounds_closed - 1,
    'correct_index', public.pvp_correct_index(q.options, q.correct_answer),
    'host',  jsonb_build_object('choice', h.choice, 'correct', coalesce(h.is_correct, false), 'points', coalesce(h.points, 0)),
    'guest', jsonb_build_object('choice', g.choice, 'correct', coalesce(g.is_correct, false), 'points', coalesce(g.points, 0)),
    'host_points',  m.host_points,
    'guest_points', m.guest_points,
    'last',         v_last,
    'next_round_started_at', case when v_last then null else m.round_started_at end,
    'next_round_deadline',   case when v_last then null else m.round_deadline end));

  if v_last then
    perform public.pvp_finish(p_match, 'completed');
  end if;
end
$$;

-- ── Create ───────────────────────────────────────────────────────────────────
-- p_rematch_of: create a rematch of a finished match (same settings, and only
-- the previous opponent may join). Otherwise a fresh battle.
create or replace function public.pvp_create(
  p_exam           text,
  p_subject_id     uuid,
  p_topic_id       uuid,
  p_question_count integer,
  p_timer_secs     integer,
  p_rematch_of     uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  old       public.pvp_matches;
  v_invited uuid;
  v_qids    uuid[];
  v_code    text;
  v_id      uuid;
  v_expires timestamptz := now() + interval '10 minutes';
  v_tries   integer := 0;
  v_subject text;
  v_topic   text;
begin
  if v_uid is null then return public.pvp_err('PVP_AUTH_REQUIRED'); end if;

  if p_rematch_of is not null then
    select * into old from public.pvp_matches where id = p_rematch_of;
    if not found or old.status <> 'finished' or v_uid not in (old.host_id, coalesce(old.guest_id, old.host_id)) then
      return public.pvp_err('PVP_NOT_ALLOWED');
    end if;
    p_exam := old.exam; p_subject_id := old.subject_id; p_topic_id := old.topic_id;
    p_question_count := old.question_count; p_timer_secs := old.timer_secs;
    v_invited := case when v_uid = old.host_id then old.guest_id else old.host_id end;
  else
    if public.pvp_is_anonymous() then return public.pvp_err('PVP_ACCOUNT_REQUIRED'); end if;
  end if;

  if p_exam not in ('WAEC', 'JAMB')
     or p_timer_secs not in (10, 15, 20, 30, 45, 60)
     or p_question_count not in (5, 10, 15, 20)
     or p_subject_id is null then
    return public.pvp_err('PVP_BAD_SETTINGS');
  end if;

  -- Serialise creates so the cap check can't be raced.
  perform pg_advisory_xact_lock(hashtext('pvp_create'));

  -- One open battle per host: a new one replaces the old.
  update public.pvp_matches set status = 'cancelled', finished_at = now()
  where host_id = v_uid and status = 'waiting';

  if (select count(*) from public.pvp_matches where status in ('waiting', 'in_progress'))
     >= coalesce((public.app_setting('pvp_max_live_matches') #>> '{}')::int, 5) then
    return public.pvp_err('PVP_FULL');
  end if;

  select array_agg(id order by r) into v_qids
  from (
    select (x ->> 'id')::uuid as id, random() as r
    from public.get_practice_questions(array[p_subject_id], p_exam, p_topic_id, null, p_question_count, true) x
    limit p_question_count
  ) s;

  if coalesce(array_length(v_qids, 1), 0) < least(p_question_count, 5) then
    return public.pvp_err('PVP_NOT_ENOUGH_QUESTIONS');
  end if;

  select name into v_subject from public.subjects where id = p_subject_id;
  if p_topic_id is not null then select name into v_topic from public.topics where id = p_topic_id; end if;

  loop
    v_code := public.pvp_new_code();
    begin
      insert into public.pvp_matches
        (code, host_id, invited_id, host_name, exam, subject_id, subject_name, topic_id, topic_name,
         question_ids, question_count, timer_secs, rematch_of, expires_at)
      values
        (v_code, v_uid, v_invited, coalesce(
           case when p_rematch_of is not null then case when v_uid = old.host_id then old.host_name else old.guest_name end end,
           public.pvp_first_name(v_uid), 'Player'),
         p_exam, p_subject_id, v_subject, p_topic_id, v_topic,
         v_qids, array_length(v_qids, 1), p_timer_secs, p_rematch_of, v_expires)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 20 then raise; end if;
    end;
  end loop;

  if p_rematch_of is not null then
    perform public.pvp_broadcast(p_rematch_of, 'rematch', jsonb_build_object(
      'match_id', v_id, 'code', v_code,
      'from', case when v_uid = old.host_id then 'host' else 'guest' end));
  end if;

  return jsonb_build_object('ok', true, 'match_id', v_id, 'code', v_code, 'expires_at', v_expires);
end
$$;

-- ── Preview (challenge screen + link preview; safe for anyone) ──────────────
create or replace function public.pvp_preview(p_code text)
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'ok', true,
       'status', case when m.status = 'waiting' and m.expires_at < now() then 'expired' else m.status end,
       'host_name', m.host_name, 'exam', m.exam, 'subject_name', m.subject_name, 'topic_name', m.topic_name,
       'question_count', m.question_count, 'timer_secs', m.timer_secs,
       'expires_at', m.expires_at, 'is_rematch', m.rematch_of is not null)
     from public.pvp_matches m
     where m.code = upper(trim(p_code))
     order by m.created_at desc
     limit 1),
    public.pvp_err('PVP_CODE_NOT_FOUND'))
$$;

-- ── Join ─────────────────────────────────────────────────────────────────────
create or replace function public.pvp_join(p_code text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  m      public.pvp_matches;
  v_name text;
begin
  if v_uid is null then return public.pvp_err('PVP_AUTH_REQUIRED'); end if;

  if (select count(*) from public.pvp_join_failures where user_id = v_uid and at > now() - interval '1 minute') >= 5 then
    return public.pvp_err('PVP_TOO_MANY_ATTEMPTS');
  end if;

  select * into m from public.pvp_matches
  where code = upper(trim(p_code)) and status = 'waiting'
  for update;

  if not found then
    insert into public.pvp_join_failures (user_id) values (v_uid);
    return public.pvp_err('PVP_CODE_NOT_FOUND');
  end if;

  if m.expires_at < now() then
    update public.pvp_matches set status = 'expired', finished_at = now() where id = m.id;
    return public.pvp_err('PVP_EXPIRED');
  end if;
  if m.host_id = v_uid then return public.pvp_err('PVP_OWN_BATTLE'); end if;
  if m.invited_id is not null and m.invited_id <> v_uid then return public.pvp_err('PVP_NOT_INVITED'); end if;

  -- Name: what they typed, else their name from the match being rematched,
  -- else their profile's first name.
  v_name := coalesce(
    nullif(left(trim(p_display_name), 30), ''),
    (select case when v_uid = o.host_id then o.host_name else o.guest_name end
     from public.pvp_matches o where o.id = m.rematch_of),
    public.pvp_first_name(v_uid),
    'Player');

  -- 3-2-1 countdown, then round 1.
  update public.pvp_matches
  set guest_id         = v_uid,
      guest_name       = v_name,
      status           = 'in_progress',
      started_at       = now(),
      current_index    = 0,
      round_started_at = now() + interval '4 seconds',
      round_deadline   = now() + interval '4 seconds' + make_interval(secs => timer_secs + 2),
      last_activity_at = now()
  where id = m.id
  returning * into m;

  perform public.pvp_broadcast(m.id, 'joined', jsonb_build_object(
    'guest_name', m.guest_name,
    'round_started_at', m.round_started_at, 'round_deadline', m.round_deadline));

  return jsonb_build_object('ok', true, 'match_id', m.id);
end
$$;

-- ── Answer (may be changed until the round closes) ─────────────────────────
create or replace function public.pvp_answer(p_match uuid, p_q_index integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  m          public.pvp_matches;
  v_role     text;
  v_opts     jsonb;
  v_first    boolean;
  v_count    integer;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found then return public.pvp_err('PVP_NOT_A_PLAYER'); end if;
  v_role := public.pvp_role(m, v_uid);
  if v_role is null                 then return public.pvp_err('PVP_NOT_A_PLAYER');     end if;
  if m.status <> 'in_progress'      then return public.pvp_err('PVP_NOT_IN_PROGRESS');  end if;
  if p_q_index <> m.current_index   then return public.pvp_err('PVP_WRONG_ROUND');      end if;
  if now() < m.round_started_at     then return public.pvp_err('PVP_ROUND_NOT_STARTED'); end if;
  if now() > m.round_deadline then
    perform public.pvp_close_round(p_match);
    return public.pvp_err('PVP_TIME_UP');
  end if;

  select options into v_opts from public.questions where id = m.question_ids[m.current_index + 1];
  if p_choice is null or p_choice < 0 or p_choice >= public.pvp_option_count(v_opts) then
    return public.pvp_err('PVP_BAD_CHOICE');
  end if;

  insert into public.pvp_answers (match_id, player_id, q_index, choice, answered_at, ms_taken)
  values (p_match, v_uid, p_q_index, p_choice, now(),
          greatest(0, (extract(epoch from (now() - m.round_started_at)) * 1000)::int))
  on conflict (match_id, player_id, q_index) do update
    set choice = excluded.choice, answered_at = excluded.answered_at, ms_taken = excluded.ms_taken
  returning (xmax = 0) into v_first;

  update public.pvp_matches set last_activity_at = now() where id = p_match;

  -- Tell the opponent *that* you answered — never what.
  if v_first then
    perform public.pvp_broadcast(p_match, 'answered', jsonb_build_object('role', v_role, 'q_index', p_q_index));
  end if;

  select count(*) into v_count from public.pvp_answers where match_id = p_match and q_index = p_q_index;
  if v_count >= 2 then
    perform public.pvp_close_round(p_match);
  end if;

  return jsonb_build_object('ok', true, 'changed', not v_first, 'round_closed', v_count >= 2);
end
$$;

-- ── Tick: close a round whose time is up (safe for both phones to call) ────
create or replace function public.pvp_tick(p_match uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m     public.pvp_matches;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found or public.pvp_role(m, v_uid) is null then return public.pvp_err('PVP_NOT_A_PLAYER'); end if;

  if m.status = 'waiting' and m.expires_at < now() then
    update public.pvp_matches set status = 'expired', finished_at = now() where id = p_match;
  elsif m.status = 'in_progress' and now() > m.round_deadline then
    perform public.pvp_close_round(p_match);
  end if;

  return public.pvp_state(p_match);
end
$$;

-- ── Leave: cancel a waiting battle, or forfeit a live one ──────────────────
create or replace function public.pvp_leave(p_match uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m     public.pvp_matches;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found or public.pvp_role(m, v_uid) is null then return public.pvp_err('PVP_NOT_A_PLAYER'); end if;

  if m.status = 'waiting' then
    update public.pvp_matches set status = 'cancelled', finished_at = now() where id = p_match;
    perform public.pvp_broadcast(p_match, 'cancelled', '{}'::jsonb);
  elsif m.status = 'in_progress' then
    perform public.pvp_finish(p_match, 'forfeit', v_uid);
  end if;
  return jsonb_build_object('ok', true);
end
$$;

-- ── Rematch (a brand-new match; earlier results are never touched) ─────────
create or replace function public.pvp_rematch(p_match uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$ select public.pvp_create(null, null, null, null, null, p_match) $$;

-- ── State: everything a phone needs to draw the screen ─────────────────────
-- Used on open, on reconnect and as the polling fallback. Never includes the
-- correct answer for a round that is still open, nor questions not yet shown.
create or replace function public.pvp_state(p_match uuid)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  m       public.pvp_matches;
  v_role  text;
  v_opp   uuid;
  v_cur   jsonb;
  v_live  boolean;
begin
  select * into m from public.pvp_matches where id = p_match;
  if not found then return public.pvp_err('PVP_NOT_A_PLAYER'); end if;
  v_role := public.pvp_role(m, v_uid);
  if v_role is null then return public.pvp_err('PVP_NOT_A_PLAYER'); end if;
  v_opp  := case v_role when 'host' then m.guest_id else m.host_id end;

  -- The current question, once its round has started and is still open.
  v_live := m.status = 'in_progress' and now() >= m.round_started_at and m.rounds_closed = m.current_index;
  if v_live then
    select jsonb_build_object(
             'q_index', m.current_index, 'text', q.question_text, 'options', q.options,
             'passage_text', q.passage_text, 'year', q.year,
             'my_choice', (select choice from public.pvp_answers a
                           where a.match_id = m.id and a.player_id = v_uid and a.q_index = m.current_index),
             'opponent_answered', exists (select 1 from public.pvp_answers a
                           where a.match_id = m.id and a.player_id = v_opp and a.q_index = m.current_index))
      into v_cur
    from public.questions q where q.id = m.question_ids[m.current_index + 1];
  end if;

  return jsonb_build_object(
    'ok', true,
    'server_now', now(),
    'me', v_role,
    'match', jsonb_build_object(
      'id', m.id, 'code', m.code, 'status', m.status, 'result', m.result, 'finish_reason', m.finish_reason,
      'exam', m.exam, 'subject_name', m.subject_name, 'topic_name', m.topic_name,
      'question_count', m.question_count, 'timer_secs', m.timer_secs, 'expires_at', m.expires_at,
      'current_index', m.current_index, 'rounds_closed', m.rounds_closed,
      'round_started_at', m.round_started_at, 'round_deadline', m.round_deadline,
      'rematch_of', m.rematch_of),
    'host',  jsonb_build_object('name', m.host_name,  'points', m.host_points),
    'guest', jsonb_build_object('name', m.guest_name, 'points', m.guest_points),
    'current', v_cur,
    -- Closed rounds, with answers and explanations (for the reveal and review).
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
               'q_index', i, 'text', q.question_text, 'options', q.options,
               'correct_index', public.pvp_correct_index(q.options, q.correct_answer),
               'explanation', q.explanation,
               'mine', (select jsonb_build_object('choice', a.choice, 'correct', a.is_correct, 'points', a.points)
                        from public.pvp_answers a where a.match_id = m.id and a.player_id = v_uid and a.q_index = i),
               'theirs', (select jsonb_build_object('choice', a.choice, 'correct', a.is_correct, 'points', a.points)
                          from public.pvp_answers a where a.match_id = m.id and a.player_id = v_opp and a.q_index = i))
             order by i)
      from generate_series(0, m.rounds_closed - 1) i
      join public.questions q on q.id = m.question_ids[i + 1]), '[]'::jsonb));
end
$$;

-- ── Stats for the "vs friends" form strip ──────────────────────────────────
create or replace function public.pvp_my_stats()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object('played', played, 'won', won, 'drawn', drawn, 'lost', lost,
                               'recent_form', recent_form, 'last_match_at', last_match_at)
     from public.pvp_stats where student_id = auth.uid()),
    jsonb_build_object('played', 0, 'won', 0, 'drawn', 0, 'lost', 0, 'recent_form', '', 'last_match_at', null))
$$;

-- ── Sweep (every 5 minutes) ─────────────────────────────────────────────────
create or replace function public.pvp_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_expired  integer;
  v_abandon  integer := 0;
  v_closed   integer := 0;
begin
  update public.pvp_matches set status = 'expired', finished_at = now()
  where status = 'waiting' and expires_at < now();
  get diagnostics v_expired = row_count;

  -- Nobody has touched the match for 2 minutes past a deadline: both gone.
  for r in
    select id from public.pvp_matches
    where status = 'in_progress' and round_deadline < now() - interval '2 minutes'
    for update skip locked
  loop
    update public.pvp_matches set status = 'abandoned', finished_at = now() where id = r.id;
    perform public.pvp_broadcast(r.id, 'abandoned', '{}'::jsonb);
    v_abandon := v_abandon + 1;
  end loop;

  -- Close rounds that are simply overdue (players still around).
  for r in
    select id from public.pvp_matches
    where status = 'in_progress' and round_deadline < now()
    for update skip locked
  loop
    perform public.pvp_close_round(r.id);
    v_closed := v_closed + 1;
  end loop;

  delete from public.pvp_join_failures where at < now() - interval '1 hour';
  delete from public.pvp_matches
  where status in ('finished', 'expired', 'cancelled', 'abandoned')
    and coalesce(finished_at, created_at) < now() - interval '30 days';

  return jsonb_build_object('expired', v_expired, 'abandoned', v_abandon, 'rounds_closed', v_closed);
end
$$;

-- ── Privileges ───────────────────────────────────────────────────────────────
-- Game actions are called from the phone with the player's own login, so they
-- are granted to `authenticated` (guest logins included); each one checks
-- auth.uid() itself. Preview is readable by anyone (challenge page / link
-- preview). Everything else is internal.
do $$
declare
  r record;
  v_public   text[] := array['pvp_preview'];
  v_players  text[] := array['pvp_create', 'pvp_join', 'pvp_answer', 'pvp_tick', 'pvp_leave',
                             'pvp_rematch', 'pvp_state', 'pvp_my_stats'];
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'pvp\_%' or p.proname in ('app_setting', 'credit_student_activity'))
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
    if r.proname = any(v_players || v_public) and exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
    if r.proname = any(v_public) and exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('grant execute on function %s to anon', r.sig);
    end if;
  end loop;
end
$$;

-- ── Realtime authorization: only the two players can use a match channel ──
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "pvp players receive" on realtime.messages';
    execute 'drop policy if exists "pvp players presence" on realtime.messages';
    execute $p$
      create policy "pvp players receive" on realtime.messages
      for select to authenticated
      using (
        realtime.topic() like 'pvp:%'
        and exists (
          select 1 from public.pvp_matches m
          where m.id::text = split_part(realtime.topic(), ':', 2)
            and auth.uid() in (m.host_id, m.guest_id)))
    $p$;
    execute $p$
      create policy "pvp players presence" on realtime.messages
      for insert to authenticated
      with check (
        realtime.messages.extension = 'presence'
        and realtime.topic() like 'pvp:%'
        and exists (
          select 1 from public.pvp_matches m
          where m.id::text = split_part(realtime.topic(), ':', 2)
            and auth.uid() in (m.host_id, m.guest_id)))
    $p$;
  else
    raise notice 'realtime.messages not found — skipping Realtime policies (fine outside Supabase)';
  end if;
end
$$;

commit;

-- ── Scheduled sweep (needs the pg_cron extension: Database → Extensions) ───
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'pvp-sweep') then
      perform cron.unschedule('pvp-sweep');
    end if;
    perform cron.schedule('pvp-sweep', '*/5 * * * *', 'select public.pvp_sweep()');
  else
    raise notice 'pg_cron is not enabled. Enable it, then re-run this block to schedule pvp_sweep().';
  end if;
end
$$;
