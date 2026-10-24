-- Run this entire file. All work is atomic within one DO statement.
-- No temporary tables or cross-statement session state are required.
do $$
declare
  c record;
  f record;
  tbl text;
  definition text;
  saved_checks jsonb := '[]'::jsonb;
begin
-- Admin content preparation only. Does not enable NECO for students.
-- Run before deploying the application changes. Keeps existing content IDs.

-- A shared subject cannot be assigned an exam without editorial review.
  if exists (select 1 from public.subjects where exam_type = 'BOTH') then
    raise exception 'Split subjects tagged BOTH into exam-specific subjects and reassign their content before running this migration.';
  end if;
  if exists (
    select 1 from public.questions q left join public.subjects s on s.id=q.subject_id
    where q.exam_type='BOTH' and (s.exam_type is null or s.exam_type not in ('WAEC','JAMB'))
  ) then
    raise exception 'Some shared questions have no unambiguous WAEC/JAMB owning subject. Review them first.';
  end if;


-- Retain exam checks while adding NECO and removing the old sentinel.
-- Existing IGCSE records keep their identity; they are never relabelled NECO.

  for c in
    select conrelid::regclass as relation, conname, pg_get_constraintdef(oid) as definition
    from pg_constraint
    where contype='c' and connamespace='public'::regnamespace
      and conrelid in ('public.subjects'::regclass,'public.topics'::regclass,
                      'public.subtopics'::regclass,'public.questions'::regclass)
      and pg_get_constraintdef(oid) like '%exam_type%'
      and pg_get_constraintdef(oid) like '%''WAEC''%'
  loop
    definition := replace(c.definition, '''BOTH''::text, ', '');
    definition := replace(definition, ', ''BOTH''::text', '');
    if definition not like '%''NECO''%' then
      definition := replace(definition, '''WAEC''::text', '''WAEC''::text, ''NECO''::text');
    end if;
    execute format('alter table %s drop constraint %I',c.relation,c.conname);
    saved_checks := saved_checks || jsonb_build_array(jsonb_build_object(
      'relation', c.relation::text, 'name', c.conname, 'definition', definition));
  end loop;


update public.topics t set exam_type=s.exam_type
from public.subjects s where t.subject_id=s.id and t.exam_type='BOTH';
update public.subtopics st set exam_type=s.exam_type
from public.topics t join public.subjects s on s.id=t.subject_id
where st.topic_id=t.id and st.exam_type='BOTH';
update public.questions q set exam_type=s.exam_type
from public.subjects s where q.subject_id=s.id and q.exam_type='BOTH';

-- The operational practice path uses exam_type; align arrays where present.
  foreach tbl in array array['topics','subtopics','questions'] loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=tbl and column_name='exam_types') then
      execute format('update public.%I set exam_types=array[exam_type] where exam_type in (''WAEC'',''JAMB'',''NECO'')',tbl);
    end if;
  end loop;


  for c in select * from jsonb_to_recordset(saved_checks)
    as saved(relation text, name text, definition text) loop
    execute format('alter table %s add constraint %I %s',c.relation,c.name,c.definition);
  end loop;


-- Prevent new scalar sentinel values even on installations without enum checks.
  foreach tbl in array array['subjects','topics','subtopics','questions'] loop
    if exists (select 1 from information_schema.columns where table_schema='public'
      and table_name=tbl and column_name='exam_type' and column_default like '%BOTH%') then
      execute format('alter table public.%I alter column exam_type drop default',tbl);
    end if;
    execute format('alter table public.%I drop constraint if exists content_exam_no_shared_tag',tbl);
    execute format('alter table public.%I add constraint content_exam_no_shared_tag check (exam_type <> ''BOTH'')',tbl);
  end loop;


-- Replace predicates in the installed versions, preserving later function fixes.
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('get_practice_questions','topic_question_counts','topic_frequency')
  loop
    definition := pg_get_functiondef(f.oid);
    definition := replace(definition, 'q.exam_type in (p_exam, ''BOTH'')', 'q.exam_type = p_exam');
    execute definition;
  end loop;


  for c in select conrelid::regclass as relation, conname from pg_constraint
    where contype='c' and not convalidated and connamespace='public'::regnamespace
      and conrelid in ('public.subjects'::regclass,'public.topics'::regclass,
                      'public.subtopics'::regclass,'public.questions'::regclass)
      and pg_get_constraintdef(oid) like '%exam_type%'
  loop
    execute format('alter table %s validate constraint %I',c.relation,c.conname);
  end loop;


-- Rebuild cached coverage after exam reassignment.
  if to_regclass('public.coverage_summary') is not null then
    delete from public.coverage_summary;
    insert into public.coverage_summary(subject_id, exam_type, year, count)
      select subject_id, exam_type, coverage_year, count(*)
      from (
        select subject_id, exam_type,
          case when btrim(year::text) ~ '^[0-9]{4}$'
            then btrim(year::text)::integer end as coverage_year
        from public.questions
        where is_active
      ) q
      where coverage_year is not null
      group by subject_id, exam_type, coverage_year;
  end if;
end $$;
