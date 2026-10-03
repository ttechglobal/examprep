-- 20261003_question_illustrations.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Question illustrations in practice and battle.
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- get_practice_questions (20260926_scale_hardening.sql) built its rows without
-- the illustration columns, so questions with a diagram reached practice and
-- battle without it. Same signature and rows, plus:
--
--   has_image, image_url, image_description   the question's image
--   svg_diagram                               an inline SVG diagram
--   passage_image_url                         the shared passage's image
--
-- They are read from to_jsonb(q), so a column an older schema lacks comes back
-- as null instead of failing the query.
-- ─────────────────────────────────────────────────────────────────────────────

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
           'passage_text',      q.passage_text,
           'topic_id',          q.topic_id,
           'subject_id',        q.subject_id,
           'topic_name',        t.name,
           'subject_name',      s.name,
           'has_image',         coalesce((x.j ->> 'has_image')::boolean, false),
           'image_url',         x.j -> 'image_url',
           'image_description', x.j -> 'image_description',
           'svg_diagram',       x.j -> 'svg_diagram',
           'passage_image_url', x.j -> 'passage_image_url')
  from (
    select q.*,
           row_number() over (partition by q.year order by random()) as year_rank,
           random() as r
    from public.questions q
    where q.is_active
      and q.subject_id = any(p_subject_ids)
      and q.exam_type in (p_exam, 'BOTH')
      and (p_topic_id is null or q.topic_id = p_topic_id)
      and (p_exclude  is null or not (q.id::text = any(p_exclude)))
  ) q
  cross join lateral (select to_jsonb(q) as j) x
  left join public.topics   t on t.id = q.topic_id
  left join public.subjects s on s.id = q.subject_id
  order by case when p_year_spread then q.year_rank else 0 end, q.r
  limit least(greatest(p_pool, 1), 400)
$$;
