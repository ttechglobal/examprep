-- 20261016_ambassadors_lean.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Lighter queries for the ambassador dashboard and payouts (the project is on
-- Supabase's free plan). Run AFTER 20261014_ambassadors.sql. Safe to re-run.
-- Changes no data and no behaviour: the same numbers, read more cheaply.
--
--   ambassador_dashboard         used to total through the ambassador_stats view,
--                                which groups EVERY ambassador's students and
--                                commissions on each call; now it sums just this
--                                ambassador's rows (all indexed by ambassador_id)
--   admin_record_ambassador_payout
--                                its balance check does the same
-- The ambassador_stats view stays: the admin list needs every ambassador at once.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
begin
  if to_regclass('public.referral_commissions') is null then
    raise exception 'Run 20261014_ambassadors.sql first.';
  end if;
end $$;

create or replace function public.ambassador_dashboard(p_user uuid, p_year integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_amb    public.ambassadors;
  v_earned_all integer;
  v_paid   integer;
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
  -- Only this ambassador's rows (indexed by ambassador_id), not the all-ambassadors view.
  select coalesce(sum(commission), 0)::int into v_earned_all
    from public.referral_commissions where ambassador_id = p_user and status = 'earned';
  select coalesce(sum(amount), 0)::int into v_paid
    from public.ambassador_payouts where ambassador_id = p_user;

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
    'earned_all_time', v_earned_all,
    'paid_out', v_paid, 'balance', v_earned_all - v_paid,
    'list', v_list);
end
$$;

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
  select coalesce(sum(commission), 0)::int
         - (select coalesce(sum(amount), 0)::int from public.ambassador_payouts where ambassador_id = p_ambassador)
    into v_balance
    from public.referral_commissions where ambassador_id = p_ambassador and status = 'earned';
  if p_amount > coalesce(v_balance, 0) then raise exception 'amount is more than the balance owed'; end if;

  insert into public.ambassador_payouts (ambassador_id, amount, note, created_by)
  values (p_ambassador, p_amount, nullif(trim(p_note), ''), p_actor ->> 'name')
  returning * into v_row;
  perform public.log_activity(p_actor, 'ambassador.payout', format('Paid %s to %s', p_amount, v_name),
    null, null, jsonb_build_object('ambassador_id', p_ambassador, 'payout_id', v_row.id, 'amount', p_amount, 'note', v_row.note));
  return v_row;
end
$$;

commit;
