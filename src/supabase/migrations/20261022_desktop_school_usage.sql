-- Run after the desktop activation and school purchase migrations from the
-- desktop app's app/backend folder. Separate from web-school/student slots.
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

-- Called only after the web endpoint verifies the signed device payload.
-- Reuse activation's single-use nonce and enrolled-device binding check.
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
     or event->>'event_type' is null or event->>'event_type' not in ('practice','computer_battle','feedback')
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
 with events as (
  select e.*,d.school_id from public.desktop_school_usage_events e join public.desktop_devices d on d.id=e.device_id
  where e.occurred_at >= ((now() at time zone 'Africa/Lagos')::date - (least(greatest(coalesce(p_days,30),1),90)-1))::timestamp at time zone 'Africa/Lagos'
    and e.occurred_at<=now()
 ), device_totals as (
  select device_id,school_id,count(*) filter(where event_type<>'feedback') as sessions_completed,
   sum(questions_answered) as questions_answered,sum(duration_seconds) as duration_seconds,
   count(*) filter(where event_type='feedback') as feedback_count,
   count(distinct (occurred_at at time zone 'Africa/Lagos')::date) filter(where event_type<>'feedback') as active_days
  from events group by device_id,school_id
 ), latest as (
  select device_id,max(occurred_at) filter(where event_type<>'feedback' and occurred_at<=now()) as last_practice_at
  from public.desktop_school_usage_events group by device_id
 ), school_totals as (
  select school_id,sum(sessions_completed) as sessions_completed,sum(questions_answered) as questions_answered,
   sum(duration_seconds) as duration_seconds,sum(feedback_count) as feedback_count,
   count(*) filter(where sessions_completed>0) as practising_computers from device_totals group by school_id
 )
 select jsonb_build_object('days',least(greatest(coalesce(p_days,30),1),90),
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
revoke all on function public.desktop_school_usage_report(jsonb,jsonb,uuid),public.desktop_school_usage_summary(integer) from public,anon,authenticated;
grant execute on function public.desktop_school_usage_report(jsonb,jsonb,uuid),public.desktop_school_usage_summary(integer) to service_role;
commit;
