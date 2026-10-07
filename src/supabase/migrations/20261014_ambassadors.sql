-- 20261014_ambassadors.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Teacher Ambassador program: referral codes, commissions and payouts. Run in
-- the Supabase SQL editor AFTER 20261007_schools_and_admin_log.sql and BEFORE
-- deploying the app code that uses it. Safe to re-run.
--
-- How it works
--   • A teacher signs up as an ambassador (role 'ambassador') and generates ONE
--     referral code. Students sign up through /r/CODE or type the code; that sets
--     profiles.referred_by once. Students can't change it (tg_protect_profile_columns).
--   • When an admin activates a student's first paid plan, the ambassador earns
--     commission_rate of what the student paid (20% by default). First payment
--     ONLY: renewals earn nothing, school slots earn nothing.
--   • A cancelled or refunded first payment reverses its commission, and the
--     student's next paid plan then becomes the one that earns.
--   • Payouts are recorded by an admin. balance = earned − paid out.
--
-- Tables
--   ambassadors            one per teacher: code, rate, status
--   referral_commissions   one row per earning payment (rate and amount are
--                          snapshots, so changing a rate never rewrites history)
--   ambassador_payouts     what has been paid to the ambassador
--
-- Everything is reached through the server (service role); students and
-- ambassadors never touch these tables from the browser.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Check what this relies on ────────────────────────────────────────────────
do $$
declare
  v_expected constant jsonb := '{
    "profiles.id": "uuid", "profiles.role": "text", "profiles.full_name": "text", "profiles.email": "text",
    "profiles.phone_number": "text", "profiles.created_at": "timestamp with time zone",
    "profiles.trial_ends_at": "timestamp with time zone",
    "subscriptions.id": "uuid", "subscriptions.student_id": "uuid", "subscriptions.plan_id": "text",
    "subscriptions.amount": "integer", "subscriptions.status": "text", "subscriptions.created_at": "timestamp with time zone"
  }';
  v_key text; v_type text; v_found text; r record;
begin
  for v_key, v_type in select key, value from jsonb_each_text(v_expected) loop
    select data_type into v_found from information_schema.columns
     where table_schema = 'public' and table_name = split_part(v_key, '.', 1) and column_name = split_part(v_key, '.', 2);
    if v_found is distinct from v_type then
      raise exception '% must be % (found %). Fix it before running this migration.', v_key, v_type, coalesce(v_found, 'no column');
    end if;
  end loop;

  if to_regprocedure('public.log_activity(jsonb,text,text,uuid,uuid,jsonb)') is null then
    raise exception 'log_activity is missing. Run 20261007_schools_and_admin_log.sql first.';
  end if;

  -- A CHECK on profiles.role that doesn't allow 'ambassador' would reject sign-ups.
  for r in select conname, pg_get_constraintdef(oid) as def from pg_constraint
            where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%' loop
    if r.def not ilike '%ambassador%' then
      raise exception 'profiles constraint % limits role: %. Add ''ambassador'' to it, then run this again.', r.conname, r.def;
    end if;
  end loop;
end $$;

-- ── Ambassadors ──────────────────────────────────────────────────────────────
create table if not exists public.ambassadors (
  id              uuid          primary key references public.profiles (id) on delete cascade,
  code            text          unique check (code ~ '^[A-Z0-9]{6,12}$'),   -- null until generated
  full_name       text          not null check (length(trim(full_name)) >= 2),
  phone           text,
  school_name     text,
  status          text          not null default 'active' check (status in ('active', 'paused')),
  commission_rate numeric(5, 4) not null default 0.2000 check (commission_rate >= 0 and commission_rate <= 0.5),
  created_at      timestamptz   not null default now(),
  code_created_at timestamptz
);
alter table public.ambassadors enable row level security;

-- ── Who referred a student ───────────────────────────────────────────────────
alter table public.profiles add column if not exists referred_by uuid references public.ambassadors (id) on delete set null;
alter table public.profiles add column if not exists referred_at timestamptz;
create index if not exists profiles_referred_by_idx on public.profiles (referred_by, created_at desc) where referred_by is not null;

-- Students can't set or change it from the browser: same guard as plan and role.
-- (Replaces the 20261005 version with the two referral columns added.)
create or replace function public.tg_protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old       jsonb := to_jsonb(old);
  v_patch     jsonb := '{}'::jsonb;
  k           text;
  v_protected text[] := array['total_points', 'battle_xp', 'streak_days', 'last_active_date', 'role',
                              'school_id', 'school_name', 'plan', 'plan_expires_at',
                              'trial_ends_at', 'access_expires_at', 'referred_by', 'referred_at'];
begin
  if current_user in ('anon', 'authenticated') then
    foreach k in array v_protected loop
      if v_old ? k then
        v_patch := v_patch || jsonb_build_object(k, v_old -> k);
      end if;
    end loop;
    new := jsonb_populate_record(new, v_patch);
  end if;
  return new;
end
$$;

-- …and a new profile can't arrive already referred.
create or replace function public.tg_no_client_referral_on_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.referred_by := null;
    new.referred_at := null;
  end if;
  return new;
end
$$;
drop trigger if exists no_client_referral_on_insert on public.profiles;
create trigger no_client_referral_on_insert
  before insert on public.profiles
  for each row execute function public.tg_no_client_referral_on_insert();

-- ── Commissions and payouts ──────────────────────────────────────────────────
create table if not exists public.referral_commissions (
  id              uuid          primary key default gen_random_uuid(),
  ambassador_id   uuid          not null references public.ambassadors (id) on delete cascade,
  student_id      uuid          references public.profiles (id) on delete set null,
  subscription_id uuid          unique references public.subscriptions (id) on delete set null,
  amount_paid     integer       not null check (amount_paid > 0),            -- naira the student paid
  rate            numeric(5, 4) not null,                                    -- snapshot
  commission      integer       not null check (commission >= 0),            -- naira earned
  status          text          not null default 'earned' check (status in ('earned', 'reversed')),
  created_at      timestamptz   not null default now(),
  reversed_at     timestamptz
);
create index if not exists referral_commissions_ambassador_idx on public.referral_commissions (ambassador_id, created_at desc);
-- First payment only: a student can have at most one live commission. Also the
-- backstop if two requests ever race.
create unique index if not exists referral_commissions_one_per_student
  on public.referral_commissions (student_id) where status = 'earned';
alter table public.referral_commissions enable row level security;

create table if not exists public.ambassador_payouts (
  id            uuid        primary key default gen_random_uuid(),
  ambassador_id uuid        not null references public.ambassadors (id) on delete cascade,
  amount        integer     not null check (amount > 0),
  note          text,                                       -- transfer reference
  created_by    text,                                       -- admin name
  created_at    timestamptz not null default now()
);
create index if not exists ambassador_payouts_ambassador_idx on public.ambassador_payouts (ambassador_id, created_at desc);
alter table public.ambassador_payouts enable row level security;

-- Headline numbers per ambassador (admin list and the ambassador's dashboard).
create or replace view public.ambassador_stats
with (security_invoker = true) as
select a.id as ambassador_id,
       coalesce(s.students, 0)::int        as students,
       coalesce(c.paying, 0)::int          as paying_students,
       coalesce(c.earned, 0)::int          as earned,
       coalesce(p.paid, 0)::int            as paid_out,
       (coalesce(c.earned, 0) - coalesce(p.paid, 0))::int as balance
from public.ambassadors a
left join (select referred_by, count(*) as students from public.profiles
            where referred_by is not null group by referred_by) s on s.referred_by = a.id
left join (select ambassador_id, count(*) as paying, sum(commission) as earned
             from public.referral_commissions where status = 'earned' group by ambassador_id) c on c.ambassador_id = a.id
left join (select ambassador_id, sum(amount) as paid from public.ambassador_payouts group by ambassador_id) p on p.ambassador_id = a.id;

-- ── Sign-up ──────────────────────────────────────────────────────────────────
-- Called by the partner sign-up API right after it creates the confirmed auth
-- user, so an ambassador is always made with a brand-new account.
create or replace function public.create_ambassador_account(
  p_user uuid, p_full_name text, p_email text, p_phone text, p_school text
)
returns public.ambassadors
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.ambassadors;
begin
  insert into public.profiles (id, full_name, email, phone_number, role)
  values (p_user, trim(p_full_name), lower(trim(p_email)), p_phone, 'ambassador')
  on conflict (id) do update set
    full_name = excluded.full_name, email = excluded.email, phone_number = excluded.phone_number, role = 'ambassador';

  insert into public.ambassadors (id, full_name, phone, school_name)
  values (p_user, trim(p_full_name), p_phone, nullif(trim(p_school), ''))
  returning * into v_row;

  perform public.log_activity(jsonb_build_object('type', 'system', 'name', 'Ambassador sign-up'),
    'ambassador.signup', format('%s joined as a Teacher Ambassador', v_row.full_name), null, null,
    jsonb_build_object('ambassador_id', v_row.id, 'email', lower(trim(p_email)), 'school', v_row.school_name));
  return v_row;
end
$$;

-- ── The referral code ────────────────────────────────────────────────────────
-- One code per ambassador, made once and never changed, so printed QR codes and
-- shared links keep working. Calling it again returns the same code. Letters and
-- digits that are easy to confuse (0 O 1 I) are left out.
create or replace function public.ambassador_generate_code(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_existing text;
  v_status   text;
  v_code     text;
  v_tries    integer := 0;
  i          integer;
begin
  select code, status into v_existing, v_status from public.ambassadors where id = p_user for update;
  if not found then raise exception 'ambassador not found'; end if;
  if v_existing is not null then return v_existing; end if;
  if v_status <> 'active' then raise exception 'ambassador is paused'; end if;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      update public.ambassadors set code = v_code, code_created_at = now() where id = p_user;
      return v_code;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 10 then raise; end if;
    end;
  end loop;
end
$$;

-- For the invite page: who is this code from? First name only. Paused or
-- unknown codes return nothing.
create or replace function public.referral_code_info(p_code text)
returns table (ambassador_id uuid, first_name text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, initcap(split_part(trim(a.full_name), ' ', 1))
    from public.ambassadors a
   where a.code = upper(trim(p_code)) and a.status = 'active'
$$;

-- ── Linking a student to an ambassador ───────────────────────────────────────
-- Returns: applied | invalid | already | self | too_late
--   p_late = the student is adding a code after signing up: allowed only in the
--   first 7 days and before any paid plan.
create or replace function public.apply_referral(p_student uuid, p_code text, p_late boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.profiles;
  v_amb     public.ambassadors;
begin
  select * into v_student from public.profiles where id = p_student for update;
  if not found or coalesce(v_student.role, 'student') <> 'student' then return 'invalid'; end if;
  if v_student.referred_by is not null then return 'already'; end if;

  select * into v_amb from public.ambassadors where code = upper(trim(coalesce(p_code, ''))) and status = 'active';
  if not found then return 'invalid'; end if;

  -- An ambassador can't refer themselves (same account, phone or email).
  if v_amb.id = p_student or exists (
    select 1 from public.profiles a
     where a.id = v_amb.id
       and ((a.phone_number is not null and a.phone_number = v_student.phone_number)
         or (a.email is not null and lower(a.email) = lower(v_student.email)))
  ) then return 'self'; end if;

  if p_late and (
    v_student.created_at < now() - interval '7 days'
    or exists (select 1 from public.subscriptions s
                where s.student_id = p_student and s.plan_id in ('two_months', 'annual', 'legacy'))
  ) then return 'too_late'; end if;

  update public.profiles set referred_by = v_amb.id, referred_at = now() where id = p_student;
  return 'applied';
end
$$;

-- ── Commission: first payment only ───────────────────────────────────────────
-- The one place commission is decided. Idempotent; called after every activation
-- and cancellation:
--   1. a live commission whose subscription was cancelled is reversed
--   2. a referred student with no live commission gets one on their earliest
--      remaining paid plan (two_months / annual; school and legacy never earn)
-- Commission is recorded whatever the ambassador's status: pausing stops new
-- referrals, and an admin simply doesn't pay out an ambassador they've removed.
create or replace function public.refresh_referral_commission(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref  uuid;
  v_rev  public.referral_commissions;
  v_sub  public.subscriptions;
  v_amb  public.ambassadors;
  v_name text;
  v_com  integer;
begin
  update public.referral_commissions rc
     set status = 'reversed', reversed_at = now()
    from public.subscriptions s
   where rc.subscription_id = s.id and rc.student_id = p_student and rc.status = 'earned' and s.status = 'cancelled'
  returning rc.* into v_rev;
  if found then
    select full_name into v_name from public.ambassadors where id = v_rev.ambassador_id;
    perform public.log_activity(jsonb_build_object('type', 'system', 'name', 'Referral program'),
      'referral.reverse', format('Reversed %s commission for %s (payment cancelled)', v_rev.commission, v_name),
      null, p_student, jsonb_build_object('commission_id', v_rev.id, 'ambassador_id', v_rev.ambassador_id, 'commission', v_rev.commission));
  end if;

  select referred_by into v_ref from public.profiles where id = p_student;
  if v_ref is null then return; end if;
  if exists (select 1 from public.referral_commissions where student_id = p_student and status = 'earned') then return; end if;

  select * into v_sub from public.subscriptions
   where student_id = p_student and status = 'active'
     and plan_id in ('two_months', 'annual') and coalesce(amount, 0) > 0
   order by created_at, id limit 1;
  if not found then return; end if;

  select * into v_amb from public.ambassadors where id = v_ref;
  v_com := round(v_sub.amount * v_amb.commission_rate)::int;

  insert into public.referral_commissions (ambassador_id, student_id, subscription_id, amount_paid, rate, commission)
  values (v_amb.id, p_student, v_sub.id, v_sub.amount, v_amb.commission_rate, v_com);

  perform public.log_activity(jsonb_build_object('type', 'system', 'name', 'Referral program'),
    'referral.earn', format('%s earned %s from a referred student', v_amb.full_name, v_com),
    null, p_student, jsonb_build_object('ambassador_id', v_amb.id, 'subscription_id', v_sub.id,
      'amount_paid', v_sub.amount, 'rate', v_amb.commission_rate, 'commission', v_com));
end
$$;

-- ── Subscriptions: now settle commission in the same transaction ─────────────
-- Bodies are the 20261007 versions, plus the refresh_referral_commission call.
create or replace function public.activate_subscription(
  p_student uuid, p_plan_id text, p_months integer, p_amount integer,
  p_note text default null, p_actor jsonb default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_row   public.subscriptions;
  v_name  text;
begin
  if p_months is null or p_months < 1 or p_months > 36 then
    raise exception 'months must be between 1 and 36';
  end if;
  select coalesce(nullif(trim(full_name), ''), username, 'a student') into v_name
    from public.profiles where id = p_student for update;
  if not found then raise exception 'student not found'; end if;

  select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where student_id = p_student and status = 'active';

  insert into public.subscriptions (student_id, plan_id, amount, starts_at, ends_at, note, source, created_by)
  values (p_student, p_plan_id, p_amount, v_start, v_start + make_interval(months => p_months),
          nullif(trim(p_note), ''), 'admin', p_actor ->> 'name')
  returning * into v_row;

  perform public.sync_profile_plan(p_student);
  perform public.log_activity(p_actor, 'subscription.activate',
    format('Activated %s for %s', case p_plan_id when 'annual' then 'Annual Plan' when 'two_months' then '2-Month Plan' else p_plan_id end, v_name),
    null, p_student,
    jsonb_build_object('subscription_id', v_row.id, 'plan_id', p_plan_id, 'amount', p_amount,
                       'starts_at', v_row.starts_at, 'ends_at', v_row.ends_at, 'note', v_row.note));
  perform public.refresh_referral_commission(p_student);
  return v_row;
end
$$;

create or replace function public.cancel_subscription(p_id uuid, p_reason text default null, p_actor jsonb default null)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    public.subscriptions;
  v_cut    interval;
  v_name   text;
  v_refund boolean;
begin
  select * into v_row from public.subscriptions where id = p_id for update;
  if not found then raise exception 'subscription not found'; end if;
  if v_row.status <> 'active' then return v_row; end if;
  select coalesce(nullif(trim(full_name), ''), username, 'a student') into v_name
    from public.profiles where id = v_row.student_id for update;

  -- Days of this plan not yet used: later plans start that much earlier.
  v_cut := v_row.ends_at - greatest(v_row.starts_at, least(now(), v_row.ends_at));
  update public.subscriptions
     set starts_at = starts_at - v_cut, ends_at = ends_at - v_cut
   where student_id = v_row.student_id and status = 'active'
     and id <> v_row.id and starts_at >= v_row.ends_at;

  -- A school slot comes back if the plan is cancelled within 7 days.
  v_refund := v_row.plan_id = 'school' and v_row.created_at > now() - interval '7 days';
  update public.subscriptions
     set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), ''),
         slot_refunded = v_refund
   where id = p_id
  returning * into v_row;

  perform public.sync_profile_plan(v_row.student_id);
  if p_actor is not null then
    perform public.log_activity(p_actor, 'subscription.cancel',
      format('Cancelled %s for %s', case v_row.plan_id when 'annual' then 'Annual Plan' when 'two_months' then '2-Month Plan'
             when 'school' then 'school Premium' else 'Premium' end, v_name),
      v_row.school_id, v_row.student_id,
      jsonb_build_object('subscription_id', v_row.id, 'reason', v_row.cancel_reason, 'slot_refunded', v_refund));
  end if;
  perform public.refresh_referral_commission(v_row.student_id);
  return v_row;
end
$$;

-- ── Admin ────────────────────────────────────────────────────────────────────
-- p_status / p_rate null = unchanged.
create or replace function public.admin_update_ambassador(p_actor jsonb, p_id uuid, p_status text, p_rate numeric)
returns public.ambassadors
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.ambassadors;
begin
  if p_status is not null and p_status not in ('active', 'paused') then raise exception 'unknown status'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 0.5) then raise exception 'rate must be between 0 and 0.5'; end if;
  update public.ambassadors
     set status = coalesce(p_status, status), commission_rate = coalesce(p_rate, commission_rate)
   where id = p_id
  returning * into v_row;
  if not found then raise exception 'ambassador not found'; end if;
  perform public.log_activity(p_actor, 'ambassador.update',
    format('Updated %s: status %s, rate %s%%', v_row.full_name, v_row.status, round(v_row.commission_rate * 100, 2)),
    null, null, jsonb_build_object('ambassador_id', v_row.id, 'status', v_row.status, 'rate', v_row.commission_rate));
  return v_row;
end
$$;

-- Record money paid to an ambassador. Can't exceed what they are owed.
create or replace function public.admin_record_ambassador_payout(p_actor jsonb, p_ambassador uuid, p_amount integer, p_note text)
returns public.ambassador_payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.ambassador_payouts;
  v_name    text;
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be more than zero'; end if;
  select full_name into v_name from public.ambassadors where id = p_ambassador for update;
  if not found then raise exception 'ambassador not found'; end if;
  select balance into v_balance from public.ambassador_stats where ambassador_id = p_ambassador;
  if p_amount > coalesce(v_balance, 0) then raise exception 'amount is more than the balance owed'; end if;

  insert into public.ambassador_payouts (ambassador_id, amount, note, created_by)
  values (p_ambassador, p_amount, nullif(trim(p_note), ''), p_actor ->> 'name')
  returning * into v_row;
  perform public.log_activity(p_actor, 'ambassador.payout', format('Paid %s to %s', p_amount, v_name),
    null, null, jsonb_build_object('ambassador_id', p_ambassador, 'payout_id', v_row.id, 'amount', p_amount, 'note', v_row.note));
  return v_row;
end
$$;

-- ── The ambassador's dashboard, in one call ──────────────────────────────────
-- Exams are written every year, so the numbers are viewed per year, the way the
-- admin Students page does it (Nigerian time):
--   p_year null  everything, all time
--   p_year 2026  students who joined in 2026 + commissions earned in 2026
-- A student who renews next year earns nothing (first payment only), so each
-- year's class is a fresh set the ambassador has to win again.
-- balance and paid_out are always all-time: money owed doesn't reset in January.
-- Students appear as first name + last initial only, with no contact details.
drop function if exists public.ambassador_dashboard(uuid);
create or replace function public.ambassador_dashboard(p_user uuid, p_year integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_amb    public.ambassadors;
  v_stats  public.ambassador_stats;
  v_from   timestamptz;
  v_to     timestamptz;
  v_list   jsonb;
  v_years  jsonb;
  v_joined integer;
  v_paying integer;
  v_earned integer;
begin
  select * into v_amb from public.ambassadors where id = p_user;
  if not found then return null; end if;
  select * into v_stats from public.ambassador_stats where ambassador_id = p_user;

  v_from := case when p_year is null then '-infinity'::timestamptz
                 else make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Africa/Lagos') end;
  v_to   := case when p_year is null then 'infinity'::timestamptz
                 else make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Africa/Lagos') end;

  select count(*) into v_joined from public.profiles
   where referred_by = p_user and created_at >= v_from and created_at < v_to;
  select count(*), coalesce(sum(commission), 0) into v_paying, v_earned from public.referral_commissions
   where ambassador_id = p_user and status = 'earned' and created_at >= v_from and created_at < v_to;

  -- Years with anything in them, newest first, always including this year.
  select coalesce(jsonb_agg(y order by y desc), '[]'::jsonb) into v_years from (
    select extract(year from created_at at time zone 'Africa/Lagos')::int as y from public.profiles where referred_by = p_user
    union
    select extract(year from created_at at time zone 'Africa/Lagos')::int from public.referral_commissions where ambassador_id = p_user
    union
    select extract(year from now() at time zone 'Africa/Lagos')::int
  ) t;

  select coalesce(jsonb_agg(row_to_json(x) order by x.joined desc), '[]'::jsonb) into v_list
  from (
    select
      case when nullif(trim(p.full_name), '') is null then 'Student'
           else initcap(split_part(trim(p.full_name), ' ', 1))
                || case when position(' ' in trim(p.full_name)) > 0
                        then ' ' || upper(left((regexp_match(trim(p.full_name), '(\S+)$'))[1], 1)) || '.' else '' end
      end as name,
      p.created_at as joined,
      case when c.status = 'earned' then 'subscribed'
           when exists (select 1 from public.subscriptions s where s.student_id = p.id and s.status = 'active'
                          and s.plan_id in ('two_months', 'annual', 'legacy') and s.ends_at > now()) then 'subscribed'
           when exists (select 1 from public.subscriptions s where s.student_id = p.id
                          and s.plan_id in ('two_months', 'annual', 'legacy')) then 'expired'
           when p.trial_ends_at > now() then 'trial'
           else 'free'
      end as status,
      case when c.status = 'earned' then c.commission end as commission
    from public.profiles p
    left join public.referral_commissions c on c.student_id = p.id and c.status = 'earned'
    where p.referred_by = p_user
      and ((p.created_at >= v_from and p.created_at < v_to)
        or (c.created_at >= v_from and c.created_at < v_to))
    order by p.created_at desc
    limit 500
  ) x;

  return jsonb_build_object(
    'name', v_amb.full_name, 'code', v_amb.code, 'status', v_amb.status,
    'year', p_year, 'years', v_years,
    'students', v_joined, 'paying', v_paying, 'earned', v_earned,
    'earned_all_time', coalesce(v_stats.earned, 0),
    'paid_out', coalesce(v_stats.paid_out, 0), 'balance', coalesce(v_stats.balance, 0),
    'list', v_list);
end
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.create_ambassador_account(uuid, text, text, text, text)',
    'public.ambassador_generate_code(uuid)',
    'public.referral_code_info(text)',
    'public.apply_referral(uuid, text, boolean)',
    'public.refresh_referral_commission(uuid)',
    'public.admin_update_ambassador(jsonb, uuid, text, numeric)',
    'public.admin_record_ambassador_payout(jsonb, uuid, integer, text)',
    'public.ambassador_dashboard(uuid, integer)'
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

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.ambassadors, public.referral_commissions, public.ambassador_payouts, public.ambassador_stats from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.ambassadors, public.referral_commissions, public.ambassador_payouts, public.ambassador_stats from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.ambassadors, public.referral_commissions to service_role;
    grant select, insert on public.ambassador_payouts to service_role;
    grant select on public.ambassador_stats to service_role;
  end if;
end $$;

commit;
