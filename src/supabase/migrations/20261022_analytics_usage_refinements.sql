-- Run after 20261022_shared_analytics.sql and the existing desktop activation backend.
-- Includes school usage tables if 20261022_desktop_school_usage.sql was not run.
-- Owner confirmed unattributed activity before 22 October was web usage.
-- Native evidence is preserved; future unknown activity is not blanket-classified.
begin;
create table if not exists public.desktop_school_usage_events (
 device_id text not null references public.desktop_devices(id),
 event_id uuid not null,
 event_type text not null check(event_type in ('practice','computer_battle','feedback')),
 occurred_at timestamptz not null,
 questions_answered integer not null default 0 check(questions_answered between 0 and 500),
 duration_seconds integer not null default 0 check(duration_seconds between 0 and 86400),
 feedback_reason text check(feedback_reason in ('Wrong answer','Wrong explanation','Unclear question','Missing diagram','Other')),
 received_at timestamptz not null default now(),
 primary key(device_id,event_type,event_id),
 check((event_type='feedback' and feedback_reason is not null and questions_answered=0 and duration_seconds=0)
    or (event_type<>'feedback' and feedback_reason is null))
);
create index if not exists desktop_usage_time on public.desktop_school_usage_events(occurred_at,device_id);
create table if not exists public.desktop_school_usage_status (
 device_id text primary key references public.desktop_devices(id),
 last_reported_at timestamptz not null default now(),
 app_version text not null default '' check(length(app_version)<=60)
);
alter table public.desktop_school_usage_events enable row level security;
alter table public.desktop_school_usage_status enable row level security;
revoke all on public.desktop_school_usage_events,public.desktop_school_usage_status from public,anon,authenticated;

insert into public.analytics_session_origins(student_id,session_id,source)
select distinct s.student_id,s.session_id,'web' from public.practice_sessions s
where s.session_id is not null and s.created_at < timestamptz '2026-10-22 00:00:00+01'
 and not exists(select 1 from public.account_progress_events e where e.account=s.student_id and e.id in ('practice:'||s.session_id,'battle:'||s.session_id))
on conflict(student_id,session_id) do nothing;
create index if not exists analytics_question_time on public.question_attempts(created_at,student_id);
create index if not exists desktop_usage_latest_practice on public.desktop_school_usage_events(device_id,occurred_at desc) where event_type<>'feedback';
alter table public.desktop_school_usage_events drop constraint if exists desktop_school_usage_events_event_type_check;
alter table public.desktop_school_usage_events add constraint desktop_school_usage_events_event_type_check check(event_type in ('practice','computer_battle','friend_battle','feedback'));
create or replace view public.analytics_learning_facts
with (security_invoker=true) as
 select q.student_id,q.session_id,q.subject_id,q.topic_id,q.subject_name,q.exam_type,q.created_at,
  1::bigint as answered,(case when q.is_correct then 1 else 0 end)::bigint as correct,
  coalesce(o.source,case when q.session_id like 'pvp-%' or q.created_at < timestamptz '2026-10-22 00:00:00+01' then 'web' else 'unknown' end) as source
 from public.question_attempts q left join public.analytics_session_origins o on o.student_id=q.student_id and o.session_id=q.session_id
 union all
 select t.account,t.session_id,t.subject_id,t.topic_id,t.subject_name,t.exam,t.attempted_at,t.answered,t.correct,'app'::text
 from public.account_topic_results t where not exists(select 1 from public.question_attempts q where q.student_id=t.account and q.session_id=t.session_id);
create or replace function public.admin_analytics_snapshot(p_days integer default 30,p_exam text default null)
returns jsonb language sql stable security definer set search_path=public,pg_temp
set statement_timeout='8s' as $$
 with bounds as materialized (
  select (now() at time zone 'Africa/Lagos')::date as today,
   least(greatest(coalesce(p_days,30),1),90) as days
 ), dates as materialized (
  select *, case when days=1 then ((now()-interval '24 hours') at time zone 'Africa/Lagos')::date else today-days+1 end as first_day,
   case when days=1 then now()-interval '24 hours' else ((today-days+1)::timestamp at time zone 'Africa/Lagos') end as start_at,
   case when days=1 then now()-interval '48 hours' else ((today-2*days+1)::timestamp at time zone 'Africa/Lagos') end as previous_at,
   case when days=1 then now() else ((today+1)::timestamp at time zone 'Africa/Lagos') end as end_at from bounds
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
 session_rows as (
  select student_id,session_id,mode,topic_name,exam_type,created_at,completed from public.practice_sessions
  union all
  select f.student_id,f.session_id,'battle_friends',null,min(f.exam_type),max(f.created_at),true
  from facts f where f.session_id like 'pvp-%'
   and not exists(select 1 from public.practice_sessions s where s.student_id=f.student_id and s.session_id=f.session_id)
  group by f.student_id,f.session_id
 ), sessions as materialized (
  select s.*,coalesce(o.source,case when s.mode='battle_friends' or s.created_at < timestamptz '2026-10-22 00:00:00+01' then 'web' else 'unknown' end) as source,
   case when s.mode='battle_friends' then 'battle_friends' when o.source='app' and s.mode='practice' then 'app_practice'
    else public.analytics_session_feature(s.mode,s.topic_name) end as feature
  from session_rows s join eligible e on e.id=s.student_id
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
   and not exists(select 1 from public.question_attempts q where q.student_id=e.id and q.session_id like 'pvp-%')
  order by e.created_at desc,e.id limit 20
 ), daily as (
  select g.day::date as day,count(distinct f.student_id) as active,coalesce(sum(f.answered),0) as questions
  from dates d cross join lateral generate_series(d.first_day::timestamp,d.today::timestamp,interval '1 day') g(day)
  left join current_facts f on f.day=g.day::date group by 1 order by 1
 )
 select jsonb_build_object('version',2,'range',jsonb_build_object('from',d.first_day,'to',d.today,'days',d.days,'start_at',d.start_at,'end_at',least(d.end_at,now())),
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
create or replace function public.desktop_school_usage_report(p_device jsonb,p_input jsonb,p_nonce uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; event jsonb; event_time timestamptz; q integer; seconds integer;
begin
 result:=public.desktop_activation_execute('status',p_device,'{}'::jsonb,p_nonce,null);
 if result->>'registered' is distinct from 'true' then raise exception 'Register this computer before reporting usage.'; end if;
 if jsonb_typeof(p_input->'events') is distinct from 'array' or jsonb_array_length(p_input->'events')>100
    or length(coalesce(p_input->>'app_version',''))>60 then raise exception 'Invalid usage report.'; end if;
 for event in select value from jsonb_array_elements(p_input->'events') loop
  if jsonb_typeof(event) is distinct from 'object' or event->>'event_id' is null
     or event->>'event_type' is null or event->>'event_type' not in ('practice','computer_battle','friend_battle','feedback')
     or event->>'occurred_at' is null then raise exception 'Invalid usage event.'; end if;
  event_time:=(event->>'occurred_at')::timestamptz;
  if not isfinite(event_time) or event_time>now()+interval '1 day' or event_time<now()-interval '5 years' then raise exception 'Invalid usage event date.'; end if;
  if jsonb_typeof(event->'questions_answered') is distinct from 'number'
     or jsonb_typeof(event->'duration_seconds') is distinct from 'number'
     or (event->>'questions_answered') !~ '^[0-9]+$'
     or (event->>'duration_seconds') !~ '^[0-9]+$' then raise exception 'Invalid usage counters.'; end if;
  q:=(event->>'questions_answered')::integer; seconds:=(event->>'duration_seconds')::integer;
  if q not between 0 and 500 or seconds not between 0 and 86400 then raise exception 'Invalid usage counters.'; end if;
  if event->>'event_type'='feedback' then
   if event->>'feedback_reason' is null or event->>'feedback_reason' not in ('Wrong answer','Wrong explanation','Unclear question','Missing diagram','Other')
      or q<>0 or seconds<>0 then raise exception 'Invalid feedback report.'; end if;
  elsif event->>'feedback_reason' is not null then raise exception 'Invalid usage feedback.'; end if;
  insert into public.desktop_school_usage_events(device_id,event_id,event_type,occurred_at,questions_answered,duration_seconds,feedback_reason)
  values(p_device->>'device_id',(event->>'event_id')::uuid,event->>'event_type',event_time,q,seconds,event->>'feedback_reason')
  on conflict(device_id,event_type,event_id) do nothing;
 end loop;
 insert into public.desktop_school_usage_status(device_id,app_version) values(p_device->>'device_id',coalesce(p_input->>'app_version',''))
 on conflict(device_id) do update set last_reported_at=now(),app_version=excluded.app_version;
 return jsonb_build_object('ok',true,'accepted',coalesce((select jsonb_agg(jsonb_build_object('event_id',value->>'event_id','event_type',value->>'event_type'))
   from jsonb_array_elements(p_input->'events')),'[]'::jsonb),'server_time',now());
end $$;

create or replace function public.desktop_school_usage_summary(p_days integer default 30)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 with recent as materialized (
  select e.*,d.school_id from public.desktop_school_usage_events e join public.desktop_devices d on d.id=e.device_id
  where e.occurred_at>=now()-interval '90 days' and e.occurred_at<=now()
 ), events as materialized (
  select * from recent where occurred_at >= case when p_days=1 then now()-interval '24 hours'
   else (((now() at time zone 'Africa/Lagos')::date - (least(greatest(coalesce(p_days,30),1),90)-1))::timestamp at time zone 'Africa/Lagos') end
 ), device_totals as (
  select device_id,school_id,count(*) filter(where event_type<>'feedback') as sessions_completed,
   sum(questions_answered) as questions_answered,sum(duration_seconds) as duration_seconds,
   count(*) filter(where event_type='feedback') as feedback_count,
   count(distinct (occurred_at at time zone 'Africa/Lagos')::date) filter(where event_type<>'feedback') as active_days
  from events group by device_id,school_id
 ), latest as (
  select d.id as device_id,l.last_practice_at from public.desktop_devices d left join lateral (
   select e.occurred_at as last_practice_at from public.desktop_school_usage_events e
   where e.device_id=d.id and e.event_type<>'feedback' and e.occurred_at<=now()
   order by e.occurred_at desc limit 1
  ) l on true
 ), school_totals as (
  select school_id,sum(sessions_completed) as sessions_completed,sum(questions_answered) as questions_answered,
   sum(duration_seconds) as duration_seconds,sum(feedback_count) as feedback_count,
   count(*) filter(where sessions_completed>0) as practising_computers from device_totals group by school_id
 )
 select jsonb_build_object('days',least(greatest(coalesce(p_days,30),1),90),
  'averages',(select jsonb_build_object('days',90,
   'sessions_per_day',count(*) filter(where event_type<>'feedback')/90.0,
   'questions_per_day',coalesce(sum(questions_answered),0)/90.0,
   'minutes_per_day',coalesce(sum(duration_seconds),0)/5400.0) from recent),
  'modes',coalesce((select jsonb_agg(to_jsonb(m)) from (select event_type,count(*) as sessions from events where event_type<>'feedback' group by event_type) m),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(jsonb_build_object('device_id',d.id,
   'sessions_completed',coalesce(t.sessions_completed,0),'questions_answered',coalesce(t.questions_answered,0),
   'duration_seconds',coalesce(t.duration_seconds,0),'feedback_count',coalesce(t.feedback_count,0),'active_days',coalesce(t.active_days,0),
   'last_practice_at',l.last_practice_at,'last_reported_at',s.last_reported_at,'app_version',s.app_version))
   from public.desktop_devices d left join device_totals t on t.device_id=d.id
   left join latest l on l.device_id=d.id left join public.desktop_school_usage_status s on s.device_id=d.id),'[]'::jsonb),
  'schools',coalesce((select jsonb_agg(to_jsonb(t)) from school_totals t),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(f)) from (select school_id,feedback_reason,count(*) as reports
    from events where event_type='feedback' group by school_id,feedback_reason) f),'[]'::jsonb),
  'totals',jsonb_build_object('sessions_completed',coalesce((select sum(sessions_completed) from device_totals),0),
   'questions_answered',coalesce((select sum(questions_answered) from device_totals),0),
   'feedback_count',coalesce((select sum(feedback_count) from device_totals),0),
   'practising_computers',(select count(*) from device_totals where sessions_completed>0)));
$$;
revoke all on function public.admin_analytics_snapshot(integer,text),public.desktop_school_usage_summary(integer),public.desktop_school_usage_report(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.admin_analytics_snapshot(integer,text),public.desktop_school_usage_summary(integer),public.desktop_school_usage_report(jsonb,jsonb,uuid) to service_role;
commit;
