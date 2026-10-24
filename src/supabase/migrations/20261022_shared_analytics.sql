-- Run AFTER mobile account progress + account learning summaries migrations.
-- Does not change XP, student access, existing analytics RPCs or school devices.
begin;
do $$ begin
 if to_regclass('public.account_topic_results') is null or to_regclass('public.account_progress_events') is null then
  raise exception 'Apply the mobile account progress and account learning summaries migrations first';
 end if;
end $$;
create table if not exists public.analytics_session_origins (
 student_id uuid not null references public.profiles(id) on delete cascade,
 session_id text not null,
 source text not null check(source in ('web','app','unknown')),
 recorded_at timestamptz not null default now(),
 primary key(student_id,session_id)
);
create table if not exists public.analytics_excluded_students (
 student_id uuid primary key references public.profiles(id) on delete cascade,
 reason text not null check(length(trim(reason))>=3),
 created_at timestamptz not null default now()
);
alter table public.analytics_session_origins enable row level security;
alter table public.analytics_excluded_students enable row level security;
revoke all on public.analytics_session_origins,public.analytics_excluded_students from public,anon,authenticated;

-- Exact identities already confirmed as production smoke tests, not a pattern.
insert into public.analytics_excluded_students(student_id,reason)
select p.id,'Confirmed mobile integration signup/referral smoke test, 19 October 2026'
from public.profiles p join auth.users u on u.id=p.id
where u.email in ('native-referral-check-6ee543393f@examprepa1.online','native-signup-check-ccd468c4ef73@examprepa1.online')
on conflict(student_id) do nothing;

-- Native sync inserts its progress identity before inserting its session.
create or replace function public.analytics_capture_app_session()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.session_id is not null and exists(select 1 from public.account_progress_events e
   where e.account=new.student_id and e.id in ('practice:'||new.session_id,'battle:'||new.session_id)) then
  insert into public.analytics_session_origins(student_id,session_id,source) values(new.student_id,new.session_id,'app')
  on conflict(student_id,session_id) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists analytics_capture_app_session on public.practice_sessions;
create trigger analytics_capture_app_session after insert on public.practice_sessions
for each row execute function public.analytics_capture_app_session();

insert into public.analytics_session_origins(student_id,session_id,source)
select distinct s.student_id,s.session_id,'app' from public.practice_sessions s
where s.session_id is not null and exists(select 1 from public.account_progress_events e
 where e.account=s.student_id and e.id in ('practice:'||s.session_id,'battle:'||s.session_id))
on conflict(student_id,session_id) do nothing;
-- These sessions have records in the web grading pipeline. Unattributed
-- session-only history stays Unknown; it is never silently assigned to Web.
insert into public.analytics_session_origins(student_id,session_id,source)
select distinct q.student_id,q.session_id,'web' from public.question_attempts q
where q.session_id is not null and exists(select 1 from public.practice_sessions s where s.student_id=q.student_id and s.session_id=q.session_id)
on conflict(student_id,session_id) do nothing;

-- Reuse the existing event write: no extra telemetry request/RPC per session.
create or replace function public.record_student_event(p_student uuid,p_event text,p_feature text,p_ref text,p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.student_events(student_id,event,feature,ref,detail)
 values(p_student,p_event,p_feature,p_ref,coalesce(p_detail,'{}'::jsonb))
 on conflict(student_id,event,ref) where ref is not null do nothing;
 if p_event='session_complete' and p_detail->>'source'='web' and exists(select 1 from public.practice_sessions s
  where s.student_id=p_student and s.session_id=p_detail->>'session_id') then
  insert into public.analytics_session_origins(student_id,session_id,source) values(p_student,p_detail->>'session_id','web')
  on conflict(student_id,session_id) do nothing;
 end if;
end $$;

create index if not exists analytics_native_time on public.account_topic_results(attempted_at,account);
create index if not exists analytics_native_session on public.account_topic_results(account,session_id);
create index if not exists analytics_question_session on public.question_attempts(student_id,session_id);
create index if not exists analytics_session_time on public.practice_sessions(created_at,student_id);
create index if not exists analytics_student_session_time on public.practice_sessions(student_id,created_at);

create or replace view public.analytics_learning_facts
with (security_invoker=true) as
 select q.student_id,q.session_id,q.subject_id,q.topic_id,q.subject_name,q.exam_type,q.created_at,
  1::bigint as answered,(case when q.is_correct then 1 else 0 end)::bigint as correct,
  coalesce(o.source,'unknown') as source
 from public.question_attempts q left join public.analytics_session_origins o on o.student_id=q.student_id and o.session_id=q.session_id
 union all
 select t.account,t.session_id,t.subject_id,t.topic_id,t.subject_name,t.exam,t.attempted_at,t.answered,t.correct,'app'::text
 from public.account_topic_results t where not exists(select 1 from public.question_attempts q where q.student_id=t.account and q.session_id=t.session_id);
revoke all on public.analytics_learning_facts from public,anon,authenticated;

create or replace function public.admin_analytics_snapshot(p_days integer default 30,p_exam text default null)
returns jsonb language sql stable security definer set search_path=public,pg_temp
set statement_timeout='8s' as $$
 with bounds as materialized (
  select (now() at time zone 'Africa/Lagos')::date as today,
   least(greatest(coalesce(p_days,30),1),90) as days
 ), dates as materialized (
  select *, today-days+1 as first_day,
   ((today-days+1)::timestamp at time zone 'Africa/Lagos') as start_at,
   ((today-2*days+1)::timestamp at time zone 'Africa/Lagos') as previous_at,
   ((today+1)::timestamp at time zone 'Africa/Lagos') as end_at from bounds
 ), eligible as materialized (
  select p.id,p.full_name,p.username,p.created_at from public.profiles p join auth.users u on u.id=p.id
  where coalesce(p.role,'student')='student' and not coalesce(u.is_anonymous,false)
   and not exists(select 1 from public.analytics_excluded_students x where x.student_id=p.id)
 ), facts as materialized (
  select f.*,(f.created_at at time zone 'Africa/Lagos')::date as day
  from public.analytics_learning_facts f join eligible e on e.id=f.student_id cross join dates d
  where f.created_at>=d.previous_at and f.created_at<d.end_at and f.created_at<=now()
   and (p_exam is null or f.exam_type=p_exam) and f.answered>0
 ), current_facts as materialized (select f.* from facts f cross join dates d where f.created_at>=d.start_at),
 sessions as materialized (
  select s.*,coalesce(o.source,'unknown') as source,
   case when o.source='app' and s.mode='practice' then 'app_practice'
    else public.analytics_session_feature(s.mode,s.topic_name) end as feature
  from public.practice_sessions s join eligible e on e.id=s.student_id
  left join public.analytics_session_origins o on o.student_id=s.student_id and o.session_id=s.session_id cross join dates d
  where s.created_at>=d.previous_at and s.created_at<d.end_at and s.created_at<=now() and s.completed
   and (p_exam is null or s.exam_type=p_exam)
 ), current_sessions as materialized (select s.* from sessions s cross join dates d where s.created_at>=d.start_at),
 per_student as materialized (
  select student_id,sum(answered) as questions,sum(correct) as correct,count(distinct day) as study_days,max(created_at) as last_activity,
   array_agg(distinct source order by source) as sources from current_facts group by student_id
 ), platform as (
  select v.source,(select count(distinct f.student_id) from current_facts f where f.source=v.source) as students,
   (select coalesce(sum(f.answered),0) from current_facts f where f.source=v.source) as questions,
   (select count(*) from current_sessions s where s.source=v.source) as sessions
  from (values('web'),('app'),('unknown')) v(source)
 ), feature_counts as (
  select feature,count(*) as sessions,count(distinct student_id) as students from current_sessions group by feature order by count(*) desc,feature
 ), subject_counts as (
  select coalesce(s.name::text,f.subject_name,'Other') as subject,sum(f.answered) as questions,count(distinct f.student_id) as students,
   round(100.0*sum(f.correct)/nullif(sum(f.answered),0)) as accuracy from current_facts f left join public.subjects s on s.id=f.subject_id
  group by 1 order by sum(f.answered) desc,1 limit 12
 ), topic_counts as materialized (
  select t.name::text as topic,coalesce(s.name::text,f.subject_name,'Other') as subject,sum(f.answered) as questions,
   count(distinct f.student_id) as students,round(100.0*sum(f.correct)/nullif(sum(f.answered),0)) as accuracy
  from current_facts f join public.topics t on t.id=f.topic_id left join public.subjects s on s.id=f.subject_id group by 1,2
 ), session_counts as (select student_id,count(*) as n from current_sessions group by student_id), active_students as (
  select e.id,e.full_name,e.username,p.questions,p.study_days,p.last_activity,p.sources,
   coalesce(sc.n,0) as sessions
  from per_student p join eligible e on e.id=p.student_id left join session_counts sc on sc.student_id=p.student_id order by p.last_activity desc,e.id limit 30
 ), return_followup as (
  select e.id,e.full_name,e.username,p.questions,p.study_days,p.last_activity,p.sources,coalesce(sc.n,0) as sessions
  from per_student p join eligible e on e.id=p.student_id left join session_counts sc on sc.student_id=p.student_id
  where p.last_activity<now()-interval '7 days' order by p.last_activity desc,e.id limit 20
 ), needs_start as (
  select e.id,e.full_name,e.username,e.created_at from eligible e cross join dates d
  where e.created_at>=d.start_at and e.created_at<now()-interval '24 hours'
   and not exists(select 1 from public.practice_sessions s where s.student_id=e.id and s.completed)
  order by e.created_at desc,e.id limit 20
 ), daily as (
  select g.day::date as day,count(distinct f.student_id) as active,coalesce(sum(f.answered),0) as questions
  from dates d cross join lateral generate_series(d.first_day::timestamp,d.today::timestamp,interval '1 day') g(day)
  left join current_facts f on f.day=g.day::date group by 1 order by 1
 )
 select jsonb_build_object('version',2,'range',jsonb_build_object('from',d.first_day,'to',d.today,'days',d.days),
  'kpis',jsonb_build_object(
   'active',(select count(*) from per_student),
   'active_prev',(select count(distinct f.student_id) from facts f where f.created_at<d.start_at),
   'questions',(select coalesce(sum(answered),0) from current_facts),
   'questions_prev',(select coalesce(sum(answered),0) from facts where created_at<d.start_at),
   'sessions',(select count(*) from current_sessions),
   'sessions_prev',(select count(*) from sessions where created_at<d.start_at),
   'new_students',(select count(*) from eligible e where e.created_at>=d.start_at and e.created_at<d.end_at),
   'new_prev',(select count(*) from eligible e where e.created_at>=d.previous_at and e.created_at<d.start_at),
   'repeat_students',(select count(*) from per_student where study_days>=2),
   'accuracy',(select round(100.0*sum(correct)/nullif(sum(answered),0)) from current_facts)),
  'daily',coalesce((select jsonb_agg(to_jsonb(x)) from daily x),'[]'::jsonb),
  'platforms',coalesce((select jsonb_agg(to_jsonb(x)) from platform x),'[]'::jsonb),
  'features',coalesce((select jsonb_agg(to_jsonb(x)) from feature_counts x),'[]'::jsonb),
  'subjects',coalesce((select jsonb_agg(to_jsonb(x)) from subject_counts x),'[]'::jsonb),
  'topics',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from topic_counts order by questions desc,topic limit 10) x),'[]'::jsonb),
  'difficult',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from topic_counts where questions>=20 and students>=3 order by accuracy,questions desc,topic limit 10) x),'[]'::jsonb),
  'students',coalesce((select jsonb_agg(to_jsonb(x)) from active_students x),'[]'::jsonb),
  'needs_return',coalesce((select jsonb_agg(to_jsonb(x)) from return_followup x),'[]'::jsonb),
  'needs_start',coalesce((select jsonb_agg(to_jsonb(x)) from needs_start x),'[]'::jsonb),
  'coverage',jsonb_build_object('unknown_sessions',(select count(*) from current_sessions where source='unknown'),
   'last_synced_app',(select max(a.updated_at) from public.account_progress_state a join eligible e on e.id=a.account),
   'last_activity',(select max(created_at) from current_facts),'exam',p_exam,
   'signup_scope','all_exams','student_limit',30,'needs_start_limit',20)) from dates d;
$$;
revoke all on function public.analytics_capture_app_session(),public.admin_analytics_snapshot(integer,text),public.record_student_event(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_analytics_snapshot(integer,text),public.record_student_event(uuid,text,text,text,jsonb) to service_role;
commit;
