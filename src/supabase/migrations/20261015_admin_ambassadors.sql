-- 20261015_admin_ambassadors.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Read functions for the admin Ambassadors page. Run in the Supabase SQL editor
-- AFTER 20261014_ambassadors.sql. Safe to re-run. Changes no data.
--
--   admin_ambassadors(year)         one row per ambassador, counted in SQL:
--                                   students / subscribed / earned for the year
--                                   (Nigerian time; null = all time), plus the
--                                   all-time earned, paid out and balance
--   admin_ambassador_students(id)   every student an ambassador referred, with
--                                   their plan state and commission (admins see
--                                   real names and contacts, unlike ambassadors)
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
begin
  if to_regclass('public.ambassadors') is null or to_regclass('public.ambassador_stats') is null then
    raise exception 'Run 20261014_ambassadors.sql first.';
  end if;
  if to_regclass('public.admin_student_rows') is null then
    raise exception 'Run 20261006_subscriptions.sql first (admin_student_rows is missing).';
  end if;
end $$;

create or replace function public.admin_ambassadors(p_year integer default null)
returns table (
  id uuid, full_name text, email text, phone text, school_name text, code text, status text,
  commission_rate numeric, created_at timestamptz,
  students integer, subscribed integer, earned integer,
  earned_all integer, paid_out integer, balance integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select case when p_year is null then '-infinity'::timestamptz else make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Africa/Lagos') end as f,
           case when p_year is null then 'infinity'::timestamptz  else make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Africa/Lagos') end as t
  )
  select a.id, a.full_name, p.email, a.phone, a.school_name, a.code, a.status, a.commission_rate, a.created_at,
         (select count(*) from public.profiles s, bounds b
           where s.referred_by = a.id and s.created_at >= b.f and s.created_at < b.t)::int as students,
         (select count(*) from public.referral_commissions c, bounds b
           where c.ambassador_id = a.id and c.status = 'earned' and c.created_at >= b.f and c.created_at < b.t)::int as subscribed,
         (select coalesce(sum(c.commission), 0) from public.referral_commissions c, bounds b
           where c.ambassador_id = a.id and c.status = 'earned' and c.created_at >= b.f and c.created_at < b.t)::int as earned,
         st.earned as earned_all, st.paid_out, st.balance
    from public.ambassadors a
    join public.profiles p on p.id = a.id
    join public.ambassador_stats st on st.ambassador_id = a.id
   order by a.created_at desc
$$;

create or replace function public.admin_ambassador_students(p_id uuid)
returns table (
  id uuid, full_name text, phone_number text, email text, created_at timestamptz,
  state text, commission integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.phone_number, r.email, r.created_at, r.state,
         case when c.status = 'earned' then c.commission end
    from public.profiles p
    join public.admin_student_rows r on r.id = p.id
    left join public.referral_commissions c on c.student_id = p.id and c.status = 'earned'
   where p.referred_by = p_id
   order by p.created_at desc
   limit 500
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_ambassadors(integer)',
    'public.admin_ambassador_students(uuid)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

commit;
