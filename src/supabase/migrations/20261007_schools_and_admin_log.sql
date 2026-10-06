-- 20261007_schools_and_admin_log.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin team accounts, one activity log, and school slots rebuilt on the
-- subscriptions ledger. Run in the Supabase SQL editor AFTER
-- 20261006_subscriptions.sql and BEFORE deploying the app code that uses it.
-- Safe to re-run.
--
-- Admins
--   admin_users       team members, each with their own login (the owner keeps
--                     using ADMIN_PASSWORD). Passwords are scrypt hashes made by
--                     the app; disabling a member ends their access.
--   activity_log      who did what, when: every subscription activated or
--                     cancelled, slots added, students added to / removed from
--                     a school, students edited or deleted, admin accounts
--                     changed. Written in the same
--                     transaction as the change, so a change can't happen
--                     without its record. Every admin can read it.
--
-- Schools
--   schools.contact_* the person who signed the school up (name, email, phone)
--   school_slot_purchases
--                     the slot ledger: the free slot every new school gets,
--                     each purchase an admin records, corrections. Slots never
--                     expire: available = all slots ever added − slots used.
--   A slot used on a student is a 12-month Premium subscription
--   (subscriptions.plan_id = 'school', school_id set). Removing the student
--   within 7 days gives the slot back (slot_refunded); after that it stays used.
--   A school's students = profiles with school_id = the school (added with a
--   slot, or joined with the school's invite code).
--   school_subscriptions (the old slot list) is moved into subscriptions here
--   and no longer used.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Check the live columns this relies on (types, not just existence) ───────
do $$
declare
  v_expected constant jsonb := '{
    "profiles.id": "uuid", "profiles.role": "text", "profiles.school_id": "uuid", "profiles.cohort_id": "uuid",
    "profiles.plan": "text", "profiles.plan_expires_at": "timestamp with time zone",
    "profiles.full_name": "text", "profiles.username": "text", "profiles.email": "text", "profiles.phone_number": "text",
    "schools.id": "uuid", "schools.name": "text", "schools.slots_purchased": "integer",
    "school_subscriptions.school_id": "uuid", "school_subscriptions.student_id": "uuid",
    "school_subscriptions.assigned_at": "timestamp with time zone", "school_subscriptions.status": "text",
    "cohorts.school_id": "uuid", "cohort_members.cohort_id": "uuid", "cohort_members.student_id": "uuid",
    "subscriptions.student_id": "uuid"
  }';
  v_key text; v_type text; v_found text;
begin
  for v_key, v_type in select key, value from jsonb_each_text(v_expected) loop
    select data_type into v_found from information_schema.columns
     where table_schema = 'public' and table_name = split_part(v_key, '.', 1) and column_name = split_part(v_key, '.', 2);
    if v_found is distinct from v_type then
      raise exception '% must be % (found %). Fix it before running this migration.', v_key, v_type, coalesce(v_found, 'no column');
    end if;
  end loop;
end $$;

-- ── Admin team ───────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null check (length(trim(name)) between 2 and 80),
  email         text        not null unique check (email = lower(email)),
  password_hash text        not null,
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  created_by    text,
  last_login_at timestamptz
);
alter table public.admin_users enable row level security;

-- ── Activity log ─────────────────────────────────────────────────────────────
-- actor: { type: 'admin' | 'school', id, name } — admin id is 'owner' for the
-- owner login; a school actor is the school admin's profile.
create table if not exists public.activity_log (
  id          bigint      generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_type  text        not null check (actor_type in ('admin', 'school', 'system')),
  actor_id    text,
  actor_name  text,
  action      text        not null,
  school_id   uuid,
  student_id  uuid,
  summary     text        not null,
  details     jsonb       not null default '{}'::jsonb
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);
create index if not exists activity_log_school_idx on public.activity_log (school_id, at desc) where school_id is not null;
create index if not exists activity_log_student_idx on public.activity_log (student_id, at desc) where student_id is not null;
alter table public.activity_log enable row level security;

create or replace function public.log_activity(
  p_actor jsonb, p_action text, p_summary text,
  p_school uuid default null, p_student uuid default null, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_log (actor_type, actor_id, actor_name, action, school_id, student_id, summary, details)
  values (coalesce(p_actor ->> 'type', 'system'), p_actor ->> 'id', p_actor ->> 'name',
          p_action, p_school, p_student, p_summary, coalesce(p_details, '{}'::jsonb));
$$;

-- ── Team changes and student edits, each with its log entry ──────────────────
-- Errors: email_taken · not_found
create or replace function public.admin_team_add(p_actor jsonb, p_name text, p_email text, p_password_hash text)
returns public.admin_users
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.admin_users;
begin
  if exists (select 1 from public.admin_users where email = lower(trim(p_email))) then raise exception 'email_taken'; end if;
  insert into public.admin_users (name, email, password_hash, created_by)
  values (trim(p_name), lower(trim(p_email)), p_password_hash, p_actor ->> 'name')
  returning * into v_row;
  perform public.log_activity(p_actor, 'admin.add', format('Added %s (%s) to the admin team', v_row.name, v_row.email),
    null, null, jsonb_build_object('admin_id', v_row.id));
  return v_row;
end
$$;

-- p_active null = unchanged; p_password_hash null = unchanged.
create or replace function public.admin_team_update(p_actor jsonb, p_id uuid, p_active boolean, p_password_hash text)
returns public.admin_users
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.admin_users;
begin
  update public.admin_users set
    active        = coalesce(p_active, active),
    password_hash = coalesce(p_password_hash, password_hash)
  where id = p_id returning * into v_row;
  if not found then raise exception 'not_found'; end if;
  if p_active is not null then
    perform public.log_activity(p_actor, case when p_active then 'admin.enable' else 'admin.disable' end,
      format('%s %s''s admin access', case when p_active then 'Restored' else 'Removed' end, v_row.name),
      null, null, jsonb_build_object('admin_id', v_row.id));
  end if;
  if p_password_hash is not null then
    perform public.log_activity(p_actor, 'admin.password', format('Reset %s''s admin password', v_row.name),
      null, null, jsonb_build_object('admin_id', v_row.id));
  end if;
  return v_row;
end
$$;

-- p_name / p_school null = unchanged; '' clears the school.
create or replace function public.admin_update_student(p_actor jsonb, p_student uuid, p_name text, p_school text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_old record;
begin
  select full_name, student_school_name into v_old from public.profiles where id = p_student for update;
  if not found then raise exception 'not_found'; end if;
  update public.profiles set
    full_name           = coalesce(p_name, full_name),
    student_school_name = case when p_school is null then student_school_name else nullif(p_school, '') end
  where id = p_student;
  perform public.log_activity(p_actor, 'student.edit',
    format('Edited %s''s details', coalesce(p_name, v_old.full_name, 'a student')), null, p_student,
    jsonb_build_object('before', jsonb_build_object('name', v_old.full_name, 'school', v_old.student_school_name),
                       'after',  jsonb_build_object('name', p_name, 'school', p_school)));
end
$$;

-- ── Schools: contact person ──────────────────────────────────────────────────
alter table public.schools add column if not exists contact_name  text;
alter table public.schools add column if not exists contact_email text;
alter table public.schools add column if not exists contact_phone text;

update public.schools s set
  contact_name  = coalesce(s.contact_name, a.full_name),
  contact_email = coalesce(s.contact_email, a.email),
  contact_phone = coalesce(s.contact_phone, a.phone_number)
from (select distinct on (school_id) school_id, full_name, email, phone_number
        from public.profiles where role = 'school_admin' and school_id is not null
       order by school_id, created_at) a
where a.school_id = s.id;

-- ── Slot ledger ──────────────────────────────────────────────────────────────
create table if not exists public.school_slot_purchases (
  id          uuid        primary key default gen_random_uuid(),
  school_id   uuid        not null references public.schools (id) on delete cascade,
  slots       integer     not null check (slots <> 0),        -- negative = a correction
  kind        text        not null check (kind in ('free', 'purchase', 'correction', 'opening')),
  amount      integer     check (amount >= 0),                 -- naira received
  note        text,
  created_at  timestamptz not null default now(),
  created_by  text                                             -- admin name
);
create index if not exists school_slot_purchases_school_idx on public.school_slot_purchases (school_id, created_at desc);
alter table public.school_slot_purchases enable row level security;

-- Slots schools had before the ledger (their old total) become an opening balance.
insert into public.school_slot_purchases (school_id, slots, kind, note, created_at)
select s.id, s.slots_purchased, 'opening', 'Slots before the slot history was recorded', coalesce(s.created_at, now())
from public.schools s
where coalesce(s.slots_purchased, 0) > 0
  and not exists (select 1 from public.school_slot_purchases p where p.school_id = s.id);

-- Every new school gets one free slot to try it out.
create or replace function public.tg_school_free_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.school_slot_purchases (school_id, slots, kind, note)
  values (new.id, 1, 'free', 'Free slot for joining');
  return new;
end
$$;
drop trigger if exists school_free_slot on public.schools;
create trigger school_free_slot after insert on public.schools
  for each row execute function public.tg_school_free_slot();

-- ── Subscriptions: school slots ──────────────────────────────────────────────
alter table public.subscriptions add column if not exists school_id uuid references public.schools (id) on delete set null;
alter table public.subscriptions add column if not exists slot_refunded boolean not null default false;
alter table public.subscriptions add column if not exists created_by text;   -- who activated it
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions add constraint subscriptions_plan_id_check
  check (plan_id in ('two_months', 'annual', 'legacy', 'school'));
create index if not exists subscriptions_school_idx on public.subscriptions (school_id, created_at desc) where school_id is not null;

-- The old slot list becomes 12-month school subscriptions from when each
-- student was added.
insert into public.subscriptions (student_id, plan_id, starts_at, ends_at, school_id, source, note, created_at)
select ss.student_id, 'school', coalesce(ss.assigned_at, now()), coalesce(ss.assigned_at, now()) + interval '12 months',
       ss.school_id, 'school', 'Added before slots were recorded as subscriptions', coalesce(ss.assigned_at, now())
from public.school_subscriptions ss
where ss.status = 'active' and ss.student_id is not null
  and exists (select 1 from public.profiles p where p.id = ss.student_id)
  and not exists (select 1 from public.subscriptions s where s.student_id = ss.student_id and s.school_id = ss.school_id);
update public.school_subscriptions set status = 'migrated' where status = 'active';

-- Students added by a school are on its roster.
update public.profiles p set school_id = s.school_id
from public.subscriptions s
where s.student_id = p.id and s.school_id is not null and s.status = 'active' and p.school_id is null;

-- ── The student's plan: the latest active subscription, whatever its source ──
create or replace function public.sync_profile_plan(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
begin
  select max(ends_at) into v_end from public.subscriptions
   where student_id = p_student and status = 'active';
  update public.profiles set
    plan            = case when v_end is not null then 'premium' else 'free' end,
    plan_expires_at = v_end
  where id = p_student;
end
$$;

do $$
declare r record;
begin
  for r in select distinct student_id from public.subscriptions loop
    perform public.sync_profile_plan(r.student_id);
  end loop;
end $$;

-- ── School sign-up: the school and its admin in one step ─────────────────────
-- Called by /api/school/signup right after it creates the confirmed auth user,
-- so a school can only be created together with a brand-new account (an
-- existing student can't turn themselves into a school admin). The free slot
-- comes from the schools trigger.
create or replace function public.create_school_account(
  p_user uuid, p_school_name text, p_full_name text, p_email text, p_phone text, p_city text, p_state text
)
returns public.schools
language plpgsql
security definer
set search_path = public
as $$
declare v_school public.schools;
begin
  insert into public.schools (name, city, state, contact_name, contact_email, contact_phone, slots_purchased, slots_used)
  values (trim(p_school_name), nullif(trim(p_city), ''), nullif(trim(p_state), ''),
          trim(p_full_name), lower(trim(p_email)), p_phone, 0, 0)
  returning * into v_school;

  insert into public.profiles (id, full_name, email, phone_number, role, school_id)
  values (p_user, trim(p_full_name), lower(trim(p_email)), p_phone, 'school_admin', v_school.id)
  on conflict (id) do update set
    full_name = excluded.full_name, email = excluded.email, phone_number = excluded.phone_number,
    role = 'school_admin', school_id = excluded.school_id;

  perform public.log_activity(jsonb_build_object('type', 'school', 'id', p_user::text, 'name', trim(p_full_name)),
    'school.signup', format('%s joined as a partner school (1 free slot)', v_school.name), v_school.id, null,
    jsonb_build_object('email', lower(trim(p_email)), 'phone', p_phone));
  return v_school;
end
$$;

-- ── Slot balance ─────────────────────────────────────────────────────────────
create or replace view public.school_slot_balance
with (security_invoker = true) as
select sc.id as school_id,
       coalesce(p.added, 0)::int as slots_total,
       coalesce(u.used, 0)::int  as slots_used,
       (coalesce(p.added, 0) - coalesce(u.used, 0))::int as slots_available
from public.schools sc
left join (select school_id, sum(slots) as added from public.school_slot_purchases group by school_id) p
  on p.school_id = sc.id
left join (select school_id, count(*) as used from public.subscriptions
            where school_id is not null and plan_id = 'school' and not slot_refunded
            group by school_id) u
  on u.school_id = sc.id;

-- ── Admin: activate / cancel (now logged, with who did it) ───────────────────
drop function if exists public.activate_subscription(uuid, text, integer, integer, text);
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
  return v_row;
end
$$;

drop function if exists public.cancel_subscription(uuid, text);
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
  return v_row;
end
$$;

-- ── Admin: add slots to a school (after payment) ─────────────────────────────
create or replace function public.admin_add_school_slots(
  p_school uuid, p_slots integer, p_amount integer, p_note text, p_actor jsonb, p_kind text default 'purchase'
)
returns public.school_slot_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    public.school_slot_purchases;
  v_school text;
  v_avail  integer;
begin
  if p_slots is null or p_slots = 0 or abs(p_slots) > 10000 then raise exception 'slots must be between 1 and 10000'; end if;
  if p_kind not in ('purchase', 'correction') then raise exception 'unknown kind'; end if;
  if p_kind = 'purchase' and p_slots < 0 then raise exception 'a purchase adds slots'; end if;
  select name into v_school from public.schools where id = p_school for update;
  if not found then raise exception 'school not found'; end if;
  if p_slots < 0 then
    select slots_available into v_avail from public.school_slot_balance where school_id = p_school;
    if v_avail + p_slots < 0 then raise exception 'cannot remove more slots than are available'; end if;
  end if;

  insert into public.school_slot_purchases (school_id, slots, kind, amount, note, created_by)
  values (p_school, p_slots, p_kind, p_amount, nullif(trim(p_note), ''), p_actor ->> 'name')
  returning * into v_row;

  perform public.log_activity(p_actor, case when p_kind = 'purchase' then 'school.slots_add' else 'school.slots_correct' end,
    case when p_slots > 0 then format('Added %s slot%s to %s', p_slots, case when p_slots = 1 then '' else 's' end, v_school)
         else format('Removed %s slot%s from %s', -p_slots, case when p_slots = -1 then '' else 's' end, v_school) end,
    p_school, null,
    jsonb_build_object('purchase_id', v_row.id, 'slots', p_slots, 'amount', p_amount, 'note', v_row.note));
  return v_row;
end
$$;

-- ── School: add a student with a slot / remove them ──────────────────────────
-- Errors are short codes the app turns into messages:
--   no_slots · not_student · already_added · not_found
create or replace function public.school_add_student(p_school uuid, p_student uuid, p_actor jsonb)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school  text;
  v_avail   integer;
  v_profile record;
  v_start   timestamptz;
  v_row     public.subscriptions;
begin
  select name into v_school from public.schools where id = p_school for update;   -- one at a time per school
  if not found then raise exception 'not_found'; end if;
  select id, role, school_id, coalesce(nullif(trim(full_name), ''), username, 'a student') as name
    into v_profile from public.profiles where id = p_student for update;
  if not found then raise exception 'not_found'; end if;
  if coalesce(v_profile.role, 'student') <> 'student' then raise exception 'not_student'; end if;
  if exists (select 1 from public.subscriptions where student_id = p_student and school_id = p_school
               and status = 'active' and ends_at > now()) then
    raise exception 'already_added';
  end if;
  select slots_available into v_avail from public.school_slot_balance where school_id = p_school;
  if coalesce(v_avail, 0) < 1 then raise exception 'no_slots'; end if;

  -- After any Premium they already have, so no paid day is lost.
  select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where student_id = p_student and status = 'active';
  insert into public.subscriptions (student_id, plan_id, starts_at, ends_at, school_id, source, created_by)
  values (p_student, 'school', v_start, v_start + interval '12 months', p_school, 'school', p_actor ->> 'name')
  returning * into v_row;

  update public.profiles set school_id = p_school where id = p_student;
  perform public.sync_profile_plan(p_student);
  perform public.log_activity(p_actor, 'school.student_add',
    format('%s added %s (used 1 slot)', v_school, v_profile.name), p_school, p_student,
    jsonb_build_object('subscription_id', v_row.id, 'ends_at', v_row.ends_at));
  return v_row;
end
$$;

-- Removes a student from the school: ends their school Premium (the slot comes
-- back within 7 days of adding them) and takes them off the roster.
create or replace function public.school_remove_student(p_school uuid, p_student uuid, p_actor jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school   text;
  v_name     text;
  v_sub      record;
  v_refunded boolean := false;
begin
  select name into v_school from public.schools where id = p_school for update;
  if not found then raise exception 'not_found'; end if;
  select coalesce(nullif(trim(full_name), ''), username, 'a student') into v_name
    from public.profiles where id = p_student and school_id = p_school for update;
  if not found then raise exception 'not_found'; end if;

  for v_sub in select id from public.subscriptions
                where student_id = p_student and school_id = p_school and status = 'active' and ends_at > now() loop
    perform public.cancel_subscription(v_sub.id, 'Removed by the school', null);
    v_refunded := v_refunded or (select slot_refunded from public.subscriptions where id = v_sub.id);
  end loop;

  update public.profiles set school_id = null, cohort_id = null where id = p_student;
  delete from public.cohort_members m using public.cohorts c
   where m.cohort_id = c.id and c.school_id = p_school and m.student_id = p_student;

  perform public.log_activity(p_actor, 'school.student_remove',
    format('%s removed %s%s', v_school, v_name, case when v_refunded then ' (slot returned)' else '' end),
    p_school, p_student, jsonb_build_object('slot_refunded', v_refunded));
  return jsonb_build_object('slot_refunded', v_refunded);
end
$$;

-- The account a school typed in: by email (the profile's, or the sign-in
-- email in auth.users, which every email account has) or by phone (any of
-- the formats it may be saved in). At most 2 rows, so the app can tell
-- "nobody" from "more than one".
create or replace function public.find_student_by_contact(p_email text, p_phones text[])
returns table (id uuid, full_name text, username text, role text, school_id uuid)
language sql stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.role, p.school_id
  from public.profiles p
  where (p_email is not null and (lower(p.email) = lower(p_email)
           or p.id in (select u.id from auth.users u where lower(u.email) = lower(p_email))))
     or (p_phones is not null and p.phone_number = any(p_phones))
  limit 2
$$;

-- ── Admin Schools page ───────────────────────────────────────────────────────
-- One row per school. Slots never expire, so total/used/available are all
-- time; bought_in_year / used_in_year are for the chosen year (Nigerian time).
create or replace function public.admin_schools(p_year integer)
returns table (
  id uuid, name text, city text, state text, created_at timestamptz,
  contact_name text, contact_email text, contact_phone text,
  slots_total integer, slots_used integer, slots_available integer,
  bought_in_year integer, used_in_year integer, students integer, premium_students integer
)
language sql stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.city, s.state, s.created_at,
         s.contact_name, s.contact_email, s.contact_phone,
         b.slots_total, b.slots_used, b.slots_available,
         coalesce((select sum(p.slots) from public.school_slot_purchases p
                    where p.school_id = s.id and p.slots > 0
                      and (p_year is null or extract(year from p.created_at at time zone 'Africa/Lagos') = p_year)), 0)::int,
         (select count(*) from public.subscriptions x
           where x.school_id = s.id and x.plan_id = 'school' and not x.slot_refunded
             and (p_year is null or extract(year from x.created_at at time zone 'Africa/Lagos') = p_year))::int,
         (select count(*) from public.profiles p where p.school_id = s.id and coalesce(p.role, 'student') = 'student')::int,
         (select count(distinct x.student_id) from public.subscriptions x
           where x.school_id = s.id and x.status = 'active' and x.starts_at <= now() and x.ends_at > now())::int
  from public.schools s
  join public.school_slot_balance b on b.school_id = s.id
$$;

-- ── Grants: server only ──────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.log_activity(jsonb, text, text, uuid, uuid, jsonb)',
    'public.admin_team_add(jsonb, text, text, text)',
    'public.admin_team_update(jsonb, uuid, boolean, text)',
    'public.admin_update_student(jsonb, uuid, text, text)',
    'public.tg_school_free_slot()',
    'public.create_school_account(uuid, text, text, text, text, text, text)',
    'public.sync_profile_plan(uuid)',
    'public.activate_subscription(uuid, text, integer, integer, text, jsonb)',
    'public.cancel_subscription(uuid, text, jsonb)',
    'public.admin_add_school_slots(uuid, integer, integer, text, jsonb, text)',
    'public.school_add_student(uuid, uuid, jsonb)',
    'public.school_remove_student(uuid, uuid, jsonb)',
    'public.find_student_by_contact(text, text[])',
    'public.admin_schools(integer)'
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
    revoke all on public.admin_users, public.activity_log, public.school_slot_purchases, public.school_slot_balance from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.admin_users, public.activity_log, public.school_slot_purchases, public.school_slot_balance from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.admin_users to service_role;
    grant select, insert on public.activity_log to service_role;
    grant select, insert on public.school_slot_purchases to service_role;
    grant select on public.school_slot_balance to service_role;
  end if;
end $$;

commit;
