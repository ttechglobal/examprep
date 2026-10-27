-- Complete student question presentation for practice, mock and live battles.
-- Apply after 20261022_question_instructions.sql. Existing function signatures,
-- match authorization and reveal timing stay unchanged.

create or replace function public.student_question_content(p_q jsonb)
returns jsonb language sql immutable
set search_path = public
as $$
  select jsonb_build_object(
    'instruction_text', p_q -> 'instruction_text',
    'passage_text', p_q -> 'passage_text',
    'passage_image_url', p_q -> 'passage_image_url',
    'has_image', coalesce(p_q -> 'has_image', 'false'::jsonb),
    'image_url', coalesce(nullif(p_q -> 'image_url', 'null'::jsonb),
      case when p_q #>> '{explanation,question_diagram,reviewed}' = 'true'
        then p_q #> '{explanation,question_diagram,image_url}' end),
    'image_description', p_q -> 'image_description',
    'svg_diagram', case when p_q #>> '{explanation,question_diagram,reviewed}' = 'true'
      and coalesce(p_q #>> '{explanation,question_diagram,svg}', '') <> ''
      then p_q #> '{explanation,question_diagram,svg}' else p_q -> 'svg_diagram' end
  )
$$;

revoke all on function public.student_question_content(jsonb) from public;
grant execute on function public.student_question_content(jsonb) to anon, authenticated, service_role;

create or replace function public.get_practice_questions(
  p_subject_ids uuid[],
  p_exam        text,
  p_topic_id    uuid    default null,
  p_exclude     text[]  default null,
  p_pool        integer default 60,
  p_year_spread boolean default true
)
returns setof jsonb
language sql volatile
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'id',                q.id,
           'question_text',     q.question_text,
           'options',           q.options,
           'correct_answer',    q.correct_answer,
           'year',              q.year,
           'difficulty',        q.difficulty,
           'explanation',       q.explanation,
           'hint',              x.j -> 'hint',
           'passage_text',      q.passage_text,
           'topic_id',          q.topic_id,
           'subject_id',        q.subject_id,
           'topic_name',        t.name,
           'subject_name',      s.name,
           'has_image',         coalesce((x.j ->> 'has_image')::boolean, false),
           'image_url',         x.j -> 'image_url',
           'image_description', x.j -> 'image_description',
           'svg_diagram',       x.j -> 'svg_diagram',
           'passage_image_url', x.j -> 'passage_image_url') || public.student_question_content(to_jsonb(q))
  from (
    select q.*,
           row_number() over (partition by q.year order by random()) as year_rank,
           random() as r
    from public.questions q
    where q.is_active
      and q.subject_id = any(p_subject_ids)
      and q.exam_type = p_exam
      and p_exam in ('WAEC', 'JAMB')
      and (p_topic_id is null or q.topic_id = p_topic_id)
      and (p_exclude  is null or not (q.id::text = any(p_exclude)))
  ) q
  cross join lateral (select to_jsonb(q) as j) x
  left join public.topics   t on t.id = q.topic_id
  left join public.subjects s on s.id = q.subject_id
  order by case when p_year_spread then q.year_rank else 0 end, q.r
  limit least(greatest(p_pool, 1), 400)
$$;

-- Imported provider keys may use lowercase letters. Keep grading aligned with the web client.
create or replace function public.pvp_is_correct(p_options jsonb, p_choice integer, p_correct text)
returns boolean
language sql immutable
as $$
  select case
    when p_choice is null or p_choice < 0 or p_choice > 4 then false
    else coalesce(
           case jsonb_typeof(p_options)
             when 'array'  then p_options ->> p_choice
             when 'object' then coalesce(p_options ->> (array['A','B','C','D','E'])[p_choice + 1], p_options ->> lower((array['A','B','C','D','E'])[p_choice + 1]))
           end = p_correct, false)
         or (array['A','B','C','D','E'])[p_choice + 1] = upper(btrim(p_correct))
  end
$$;

create or replace function public.pvp_option_count(p_options jsonb)
returns integer
language sql immutable
as $$
  select case jsonb_typeof(p_options)
    when 'array'  then jsonb_array_length(p_options)
    when 'object' then (select count(*)::int from unnest(array['A','B','C','D','E']) l where p_options ? l or p_options ? lower(l))
    else 0
  end
$$;

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
                           where a.match_id = m.id and a.player_id = v_opp and a.q_index = m.current_index)) || public.student_question_content(to_jsonb(q))
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
    'opponent_away', public.pvp_opponent_away(m, v_uid),
    -- The latest rematch of this match, so the results screen can offer
    -- "Accept rematch" or follow the requester in (Realtime or not).
    'rematch', (select jsonb_build_object('match_id', r.id, 'code', r.code, 'status', r.status,
                                          'mine', r.host_id = v_uid)
                from public.pvp_matches r where r.rematch_of = m.id
                order by r.created_at desc limit 1),
    -- Closed rounds, with answers and explanations (for the reveal and review).
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
               'q_index', i, 'text', q.question_text, 'options', q.options,
               'correct_index', public.pvp_correct_index(q.options, q.correct_answer),
               'explanation', q.explanation,
               'mine', (select jsonb_build_object('choice', a.choice, 'correct', a.is_correct, 'points', a.points)
                        from public.pvp_answers a where a.match_id = m.id and a.player_id = v_uid and a.q_index = i),
               'theirs', (select jsonb_build_object('choice', a.choice, 'correct', a.is_correct, 'points', a.points)
                          from public.pvp_answers a where a.match_id = m.id and a.player_id = v_opp and a.q_index = i)) || public.student_question_content(to_jsonb(q))
             order by i)
      from generate_series(0, m.rounds_closed - 1) i
      join public.questions q on q.id = m.question_ids[i + 1]), '[]'::jsonb));
end
$$;

