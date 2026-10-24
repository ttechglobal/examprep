-- Run as the database owner after 20261021_student_identity.sql.
-- Read-only assertions: no accounts or profiles are inserted or changed.
begin;
do $$
declare
  guest public.admin_student_rows;
  student public.admin_student_rows;
  counts jsonb;
begin
  guest := jsonb_populate_record(null::public.admin_student_rows, '{"state":"anonymous"}'::jsonb);
  student := jsonb_populate_record(null::public.admin_student_rows, '{"state":"free"}'::jsonb);
  assert public.admin_student_filter(guest, 'anonymous'), 'Guest filter must include anonymous identities';
  assert not public.admin_student_filter(guest, 'all'), 'Registered total must exclude anonymous identities';
  assert not public.admin_student_filter(guest, 'free'), 'Free students must exclude anonymous identities';
  assert public.admin_student_filter(student, 'all'), 'Registered total must include real students';
  assert not public.admin_student_filter(student, 'anonymous'), 'Guest filter must exclude real students';

  assert not exists (
    select 1 from public.admin_student_rows r join auth.users u on u.id = r.id
    where (r.state = 'anonymous') is distinct from coalesce(u.is_anonymous, false)
  ), 'Anonymous classification must match Auth';
  assert not exists (
    select 1 from public.admin_student_rows r join auth.users u on u.id = r.id
    where nullif(u.email, '') is not null and r.email is distinct from u.email
  ), 'Admin email must match the actual Auth login email';

  counts := public.admin_student_counts(null, null, null);
  assert (counts->>'anonymous')::bigint = (select count(*) from public.admin_student_rows where state = 'anonymous'), 'Guest count mismatch';
  assert (counts->>'all')::bigint = (select count(*) from public.admin_student_rows where state <> 'anonymous'), 'Registered count mismatch';
  assert not has_table_privilege('anon', 'public.admin_student_rows', 'SELECT'), 'Anonymous API role must not read admin contact data';
  assert not has_table_privilege('authenticated', 'public.admin_student_rows', 'SELECT'), 'Student API role must not read admin contact data';
end $$;
rollback;
