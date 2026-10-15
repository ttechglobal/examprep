-- Independent Practice challenges. Deploy after 20261009_frequency_and_missions.sql
-- and before the client/API. Battle missions and battle_xp are never touched.
-- Three topic challenges, 50 XP each; first set completed before Sunday pays
-- 25 extra XP. One optional extra set may unlock before Sunday. All times Lagos.
begin;

do $$
begin
  if to_regprocedure('public.award_xp(uuid,integer)') is null then
    raise exception 'award_xp(uuid,integer) must exist before Practice challenges';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='practice_sessions' and column_name='mode' and data_type='text') then
    raise exception 'practice_sessions.mode must be text';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='question_attempts' and column_name='student_id' and udt_name='uuid') then
    raise exception 'question_attempts.student_id must be uuid';
  end if;
end $$;

create table if not exists public.practice_challenge_sets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  set_number integer not null check (set_number between 1 and 2),
  starts_at timestamptz not null,
  completed_at timestamptz,
  bonus_xp integer not null default 0 check (bonus_xp in (0,25)),
  unique(student_id, week_start, set_number)
);
create table if not exists public.practice_challenges (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.practice_challenge_sets(id) on delete cascade,
  exam text not null check (exam in ('WAEC','JAMB')),
  subject_id uuid not null,
  subject_name text not null,
  topic_id uuid not null,
  topic_name text not null,
  target integer not null default 10 check (target=10),
  xp integer not null default 50 check (xp=50),
  claimed_at timestamptz,
  unique(set_id, exam, topic_id)
);
-- Re-running must validate an existing deployment, not silently accept tables
-- created earlier under a different shape.
do $$
begin
  if exists (
    select 1 from (values
      ('practice_challenge_sets','id','uuid'),('practice_challenge_sets','student_id','uuid'),
      ('practice_challenge_sets','week_start','date'),('practice_challenge_sets','set_number','int4'),
      ('practice_challenge_sets','starts_at','timestamptz'),('practice_challenge_sets','completed_at','timestamptz'),
      ('practice_challenge_sets','bonus_xp','int4'),('practice_challenges','id','uuid'),
      ('practice_challenges','set_id','uuid'),('practice_challenges','topic_id','uuid'),
      ('practice_challenges','subject_id','uuid'),('practice_challenges','exam','text'),
      ('practice_challenges','topic_name','text'),('practice_challenges','subject_name','text'),
      ('practice_challenges','target','int4'),('practice_challenges','xp','int4'),
      ('practice_challenges','claimed_at','timestamptz')
    ) expected(tbl,col,typ)
    left join information_schema.columns c on c.table_schema='public' and c.table_name=expected.tbl and c.column_name=expected.col
    where c.udt_name is distinct from expected.typ
  ) then raise exception 'Practice challenge schema does not match this migration'; end if;
end $$;
alter table public.practice_challenge_sets enable row level security;
alter table public.practice_challenges enable row level security;
grant select on public.practice_challenge_sets, public.practice_challenges to service_role;
-- Existing question_attempts_student_created_idx serves the weekly time scan;
-- the UNIQUE indexes above cover each student's sets and each set's topics.

-- Creates a set once under an account lock; racing tabs cannot unlock two sets.
create or replace function public.create_practice_challenges(p_student uuid, p_items jsonb, p_next boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_week date := date_trunc('week', public.app_today()::timestamp)::date;
  v_previous public.practice_challenge_sets;
  v_id uuid;
  v_number integer := 1;
begin
  perform pg_advisory_xact_lock(hashtextextended('practice_challenges:'||p_student::text,0));
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 3 then
    raise exception 'Supply one to three playable topics';
  end if;
  select * into v_previous from public.practice_challenge_sets
    where student_id=p_student and week_start=v_week order by set_number desc limit 1;
  if p_next then
    if v_previous.id is null or v_previous.set_number<>1 or v_previous.completed_at is null
      or public.app_today()>=v_week+6 then raise exception 'Extra set is not available'; end if;
    v_number:=2;
  elsif v_previous.id is not null then return;
  end if;
  insert into public.practice_challenge_sets(student_id,week_start,set_number,starts_at)
    values(p_student,v_week,v_number,case when v_number=1
      then v_week::timestamp at time zone 'Africa/Lagos' else clock_timestamp() end)
    returning id into v_id;
  insert into public.practice_challenges(set_id,exam,subject_id,subject_name,topic_id,topic_name)
    select v_id,x.exam,x.subject_id,x.subject_name,x.topic_id,x.topic_name
    from jsonb_to_recordset(p_items) as x(exam text,subject_id uuid,subject_name text,topic_id uuid,topic_name text);
end $$;

-- Returns progress and awards XP in the same transaction. Claimed rows and the
-- set's bonus marker are the reward ledger; none of this uses Battle records.
create or replace function public.read_practice_challenges(p_student uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_week date := date_trunc('week', public.app_today()::timestamp)::date;
  v_set public.practice_challenge_sets;
  v_item public.practice_challenges;
  v_progress integer;
  v_finished boolean;
  v_list jsonb;
  v_current jsonb := null;
  v_history jsonb := '[]'::jsonb;
  v_paid integer := 0;
  v_bonus integer;
  v_topic_finished timestamptz;
  v_set_finished timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('practice_challenges:'||p_student::text,0));
  for v_set in select * from public.practice_challenge_sets
    where student_id=p_student and week_start between v_week-7 and v_week
    order by week_start,set_number for update
  loop
    v_list:='[]'::jsonb;
    v_finished:=true;
    v_set_finished:=v_set.starts_at;
    for v_item in select * from public.practice_challenges where set_id=v_set.id order by subject_name,topic_name for update
    loop
      select least(count(*),v_item.target)::integer,
        (array_agg(q.first_at order by q.first_at))[v_item.target]
      into v_progress,v_topic_finished from (
      select a.question_id,min(a.created_at) as first_at
      from public.question_attempts a
      join public.practice_sessions s on s.session_id::text=a.session_id::text and s.student_id=a.student_id
      where a.student_id=p_student and a.topic_id::text=v_item.topic_id::text
        and s.exam_type=v_item.exam
        and s.mode in ('practice','study','quick5','timed','mock','custom')
        and a.created_at>=v_set.starts_at
        and a.created_at<((v_set.week_start+7)::timestamp at time zone 'Africa/Lagos')
      group by a.question_id) q;
      v_set_finished:=greatest(v_set_finished,v_topic_finished);
      if v_progress>=v_item.target and v_item.claimed_at is null then
        update public.practice_challenges set claimed_at=now() where id=v_item.id;
        perform public.award_xp(p_student,v_item.xp);
        v_paid:=v_paid+v_item.xp;
        v_item.claimed_at:=now();
      end if;
      if v_progress<v_item.target then v_finished:=false; end if;
      v_list:=v_list||jsonb_build_array(jsonb_build_object('id',v_item.id,'exam',v_item.exam,
        'subject_id',v_item.subject_id,'subject_name',v_item.subject_name,'topic_id',v_item.topic_id,
        'topic_name',v_item.topic_name,'target',v_item.target,'progress',v_progress,'xp',v_item.xp,
        'done',v_item.claimed_at is not null));
    end loop;
    if v_finished and jsonb_array_length(v_list)>0 and v_set.completed_at is null then
      v_bonus:=case when v_set.set_number=1 and (v_set_finished at time zone 'Africa/Lagos')::date<v_set.week_start+6 then 25 else 0 end;
      update public.practice_challenge_sets set completed_at=v_set_finished,bonus_xp=v_bonus where id=v_set.id;
      if v_bonus>0 then perform public.award_xp(p_student,v_bonus); v_paid:=v_paid+v_bonus; end if;
      v_set.completed_at:=v_set_finished; v_set.bonus_xp:=v_bonus;
    end if;
    if v_set.week_start=v_week then
      if v_current is not null then v_history:=v_history||jsonb_build_array(v_current); end if;
      v_current:=jsonb_build_object('id',v_set.id,'number',v_set.set_number,'challenges',v_list,
        'complete',v_set.completed_at is not null,'bonus_xp',v_set.bonus_xp,
        'can_unlock',v_set.set_number=1 and v_set.completed_at is not null and public.app_today()<v_week+6);
    end if;
  end loop;
  return jsonb_build_object('student_id',p_student,'week_start',v_week,'week_end',v_week+6,'early_bonus_xp',25,
    'days_left',v_week+7-public.app_today(),'set',v_current,'completed_sets',v_history,'xp_awarded',v_paid,
    'total_points',(select total_points from public.profiles where id=p_student));
end $$;

revoke all on public.practice_challenge_sets, public.practice_challenges from anon, authenticated;
revoke all on function public.create_practice_challenges(uuid,jsonb,boolean) from public,anon,authenticated;
revoke all on function public.read_practice_challenges(uuid) from public,anon,authenticated;
grant execute on function public.create_practice_challenges(uuid,jsonb,boolean) to service_role;
grant execute on function public.read_practice_challenges(uuid) to service_role;
commit;
