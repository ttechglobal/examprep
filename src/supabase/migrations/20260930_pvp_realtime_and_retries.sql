-- 20260930_pvp_realtime_and_retries.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1v1 fixes. Run AFTER 20260928_pvp_engine.sql and 20260929_fix_attempts_session_id.sql,
-- and BEFORE deploying the app code that goes with it. Safe to re-run.
-- If 20260928 is ever re-run, run this file again after it (it replaces
-- pvp_answer, pvp_join and the Realtime policies defined there).
--
-- 1. Realtime access. The policies on realtime.messages asked "is this user a
--    player in the match?" by reading pvp_matches as that user. Players have
--    no access to pvp_matches (RLS on, no policies, by design), so the answer
--    was always no: neither phone could join its match channel, and every 1v1
--    ran on polling alone. The check now runs in pvp_can_use_channel(), a
--    security-definer function, like every other pvp_* check.
--
-- 2. Safe resends. Phones now give up on a request after 8 seconds and send
--    it again, so the server may see the same request twice:
--      pvp_answer — resending the same choice used to overwrite answered_at and
--                   ms_taken with the later time (less speed bonus, worse
--                   tie-break). An unchanged choice is now left as it was.
--      pvp_join   — a resent join used to fail with PVP_CODE_NOT_FOUND (the
--                   match had already started) and count as a wrong code.
--                   It now returns the match the caller already joined.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Realtime access ──────────────────────────────────────────────────────
-- p_topic is a channel name, 'pvp:<match id>'. True only for the two players.
create or replace function public.pvp_can_use_channel(p_topic text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pvp_matches m
    where p_topic like 'pvp:%'
      and m.id::text = split_part(p_topic, ':', 2)
      and auth.uid() in (m.host_id, m.guest_id))
$$;

-- Policies are evaluated with the player's own login, so it needs execute.
revoke execute on function public.pvp_can_use_channel(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.pvp_can_use_channel(text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.pvp_can_use_channel(text) to authenticated;
  end if;
end $$;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "pvp players receive" on realtime.messages';
    execute 'drop policy if exists "pvp players presence" on realtime.messages';
    execute $p$
      create policy "pvp players receive" on realtime.messages
      for select to authenticated
      using (public.pvp_can_use_channel(realtime.topic()))
    $p$;
    execute $p$
      create policy "pvp players presence" on realtime.messages
      for insert to authenticated
      with check (realtime.messages.extension = 'presence'
                  and public.pvp_can_use_channel(realtime.topic()))
    $p$;
  else
    raise notice 'realtime.messages not found — skipping Realtime policies (fine outside Supabase)';
  end if;
end
$$;

-- ── 2a. Answer: an unchanged resend changes nothing ─────────────────────────
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
  v_first    boolean;   -- true: first answer this round; false: changed; null: same choice resent
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
    where public.pvp_answers.choice is distinct from excluded.choice
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

  return jsonb_build_object('ok', true, 'changed', v_first is false, 'round_closed', v_count >= 2);
end
$$;

-- ── 2b. Join: a resent join returns the match already joined ────────────────
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
    -- The first join went through but its reply never reached the phone.
    select * into m from public.pvp_matches
    where code = upper(trim(p_code)) and status = 'in_progress' and guest_id = v_uid;
    if found then return jsonb_build_object('ok', true, 'match_id', m.id); end if;

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
  set guest_id           = v_uid,
      guest_is_anonymous = public.pvp_is_anonymous(),
      guest_name         = v_name,
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

-- create or replace keeps existing grants; restate them so this file stands alone.
do $$
declare f text;
begin
  foreach f in array array['public.pvp_answer(uuid, integer, integer)', 'public.pvp_join(text, text)'] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;

commit;
