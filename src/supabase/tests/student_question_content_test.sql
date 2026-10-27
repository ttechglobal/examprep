-- Run after 20261026_student_question_content.sql. Pure function assertions;
-- no student records, attempts, scores or matches are changed.
begin;
do $$
declare
  display jsonb;
begin
  display := public.student_question_content('{
    "instruction_text":"Read the extract.",
    "passage_text":"First line.\nSecond line.\n— Author",
    "correct_answer":"ANSWER_SECRET",
    "explanation":{
      "answer_note":"SOLUTION_SECRET",
      "svg_diagram":"SOLUTION_SVG_SECRET",
      "content_review":{"note":"PRIVATE_NOTE"},
      "question_diagram":{"reviewed":true,"svg":"<svg></svg>","signature":"PRIVATE_SIGNATURE"}
    }
  }'::jsonb);
  assert display ->> 'instruction_text' = 'Read the extract.', 'instruction retained';
  assert display ->> 'passage_text' like '%Second line.%', 'extract retained';
  assert display ->> 'svg_diagram' = '<svg></svg>', 'given source SVG retained';
  assert display::text not like '%SECRET%', 'solutions withheld from display fields';
  assert display::text not like '%PRIVATE%', 'review metadata withheld';
  assert not (display ? 'correct_answer'), 'no answer key before reveal';
  assert not (display ? 'explanation'), 'no explanation before reveal';
  assert public.student_question_content('{}'::jsonb) -> 'instruction_text' = 'null'::jsonb, 'optional fields tolerate older rows';
  assert public.pvp_option_count('{"a":"One","b":"Two"}'::jsonb) = 2, 'lowercase options counted';
  assert public.pvp_is_correct('{"a":"One","b":"Two"}'::jsonb, 1, 'b'), 'lowercase key graded';
  assert not public.pvp_is_correct('{"a":"One","b":"Two"}'::jsonb, 0, 'b'), 'incorrect answer remains incorrect';
end;
$$;
rollback;
