-- 20261013_school_roster.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- A school's students with their Premium, in ONE query.
--
-- The school dashboard, the Slots & Premium tab and the admin Schools panel each
-- built this list in four or five round trips (the school's student ids, their
-- profiles in chunks, then every school subscription). school_roster() returns it
-- in one: each student, and when the school's Premium for them ends and was added.
--
-- Run in the Supabase SQL editor AFTER 20261012_trial_for_everyone.sql and BEFORE
-- deploying the app code that reads it. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create or replace function public.school_roster(p_school uuid)
returns table (
  id               uuid,
  full_name        text,
  username         text,
  email            text,
  phone_number     text,
  exam_type        text,
  subjects         jsonb,
  plan             text,
  plan_expires_at  timestamptz,
  created_at       timestamptz,
  school_ends_at   timestamptz,   -- the latest end of Premium this school gave them
  school_added_at  timestamptz    -- when this school used a slot on them
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id::uuid,
         p.full_name::text,
         p.username::text,
         p.email::text,
         p.phone_number::text,
         (to_jsonb(p) ->> 'exam_type')::text,
         to_jsonb(p) -> 'subjects',
         p.plan::text,
         p.plan_expires_at::timestamptz,
         p.created_at::timestamptz,
         s.ends_at::timestamptz,
         s.created_at::timestamptz
  from public.profiles p
  left join lateral (
    select x.ends_at, x.created_at
    from public.subscriptions x
    where x.school_id = p_school and x.student_id = p.id and x.status = 'active'
    order by x.ends_at desc
    limit 1
  ) s on true
  where p.school_id = p_school and p.role = 'student'
$$;

-- Makes the per-student lookup above quick.
create index if not exists subscriptions_school_student_idx
  on public.subscriptions (school_id, student_id, ends_at desc)
  where school_id is not null;

-- Server-only.
do $$
begin
  revoke execute on function public.school_roster(uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.school_roster(uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.school_roster(uuid) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.school_roster(uuid) to service_role;
  end if;
end $$;

commit;
