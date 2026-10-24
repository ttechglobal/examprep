-- Canonical signup contact; retain anonymous identities in a separate filter.
-- Existing server-only grants and dependent row types are preserved.
begin;
create or replace view public.admin_student_rows
with (security_invoker = true) as
select
  p.id, p.full_name, p.username, coalesce(nullif(u.email, ''), p.email) as email,
  coalesce(nullif(p.phone_number, ''), nullif(u.raw_user_meta_data->>'phone', ''), nullif(u.phone, '')) as phone_number, p.created_at,
  coalesce(sc.name, p.school_name, p.student_school_name) as school,
  p.plan, p.plan_expires_at, p.trial_ends_at,
  cur.plan_id as current_plan_id,
  last_sub.ends_at as last_paid_end,
  case
    when u.is_anonymous then 'anonymous'
    when p.plan = 'premium' and p.plan_expires_at is null then 'school'
    when p.plan = 'premium' and p.plan_expires_at > now() then coalesce(cur.plan_id, 'legacy')
    when p.trial_ends_at > now() then 'trial'
    when last_sub.ends_at is not null and last_sub.ends_at <= now() then 'expired'
    else 'free'
  end as state
from public.profiles p
join auth.users u on u.id = p.id
left join public.schools sc on sc.id = p.school_id
left join lateral (
  select s.plan_id from public.subscriptions s
   where s.student_id = p.id and s.status = 'active' and s.starts_at <= now() and s.ends_at > now()
   order by s.starts_at desc limit 1
) cur on true
left join lateral (
  select max(s.ends_at) as ends_at from public.subscriptions s
   where s.student_id = p.id and s.status = 'active'
) last_sub on true
where coalesce(p.role, 'student') = 'student';

create or replace function public.admin_student_filter(r public.admin_student_rows, p_filter text)
returns boolean
language sql stable
set search_path = public
as $$
  select (r.state <> 'anonymous' or p_filter = 'anonymous') and case coalesce(p_filter, 'all')
    when 'anonymous'  then r.state = 'anonymous'
    when 'all'        then r.state <> 'anonymous'
    when 'free'       then r.state in ('free', 'trial', 'expired')
    when 'trial'      then r.state = 'trial'
    when 'paid'       then r.state in ('two_months', 'annual', 'legacy', 'school')
    when 'two_months' then r.state = 'two_months'
    when 'annual'     then r.state = 'annual'
    when 'expiring'   then r.state in ('two_months', 'annual', 'legacy') and r.plan_expires_at <= now() + interval '7 days'
    when 'expired'    then r.state = 'expired'
    else false
  end
$$;

create or replace function public.admin_student_counts(p_year integer, p_school text, p_search text)
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select jsonb_object_agg(f, (select count(*) from public.admin_student_rows r
                               where public.admin_student_matches(r, p_year, p_school, p_search)
                                 and public.admin_student_filter(r, f)))
  from unnest(array['all', 'free', 'trial', 'paid', 'two_months', 'annual', 'expiring', 'expired', 'anonymous']) as f
$$;


commit;
