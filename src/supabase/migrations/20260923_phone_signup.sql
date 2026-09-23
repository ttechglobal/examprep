-- 20260923_phone_signup.sql
-- Run once in the Supabase SQL editor, in order. Safe to re-run.
-- Goes with the new sign-up flow (phone or email + password, no confirmation).

-- 1. Store every existing phone number in one format: +234XXXXXXXXXX.
--    Numbers that aren't a complete Nigerian mobile number are left untouched.
update public.profiles
set    phone_number = '+234' || right(regexp_replace(phone_number, '\D', '', 'g'), 10)
where  phone_number is not null
and    regexp_replace(phone_number, '\D', '', 'g') ~ '^(234|0)?[789][01][0-9]{8}$'
and    phone_number <> '+234' || right(regexp_replace(phone_number, '\D', '', 'g'), 10);

-- 2. Check for numbers used by more than one account. This must return no rows
--    before step 3 will succeed. Resolve any it finds (clear the number on the
--    duplicate accounts), then run step 3.
select phone_number, count(*) as accounts, array_agg(id) as profile_ids
from   public.profiles
where  phone_number is not null
group  by phone_number
having count(*) > 1;

-- 3. One account per phone number, enforced by the database.
create unique index if not exists profiles_phone_number_unique
  on public.profiles (phone_number)
  where phone_number is not null;

-- 4. Accounts created under the old flow that never clicked the confirmation
--    email can't sign in. Activate them so they can.
update auth.users
set    email_confirmed_at = now()
where  email_confirmed_at is null
and    email is not null;
