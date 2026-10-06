-- 20261012_trial_for_everyone.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Every student gets the full 14-day trial, starting now: students whose trial
-- ended, students still in the old 7-day trial, everyone. New sign-ups already
-- get 14 days (20261011).
--
-- Not touched: students who already have Premium (a paid plan or a school slot),
-- so their plan never changes; school admins; and anyone whose trial already
-- runs past 14 days from now.
--
-- Students see a one-time welcome from the mascot the next time they open the app
-- ("You have 14 days of Premium"). Run this on the day you start telling them.
-- It sets a date, so running it twice just restarts the 14 days from that moment.
-- Run in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

update public.profiles p
   set trial_ends_at = now() + interval '14 days'
 where coalesce(p.role, 'student') = 'student'
   and (p.trial_ends_at is null or p.trial_ends_at < now() + interval '14 days')
   and not (p.plan = 'premium' and (p.plan_expires_at is null or p.plan_expires_at > now()));

-- How many students are on the trial now (should be everyone without Premium).
select count(*) filter (where trial_ends_at > now()) as on_trial,
       count(*)                                       as students
  from public.profiles
 where coalesce(role, 'student') = 'student';

commit;
