-- Read-only inspection. Run in Supabase SQL Editor as the database owner.
-- This does not change permissions, policies, accounts or application data.
begin transaction read only;

-- 1. Table permissions and RLS. A grant alone does not mean rows are visible:
-- policies must be reviewed too. Pay attention to RLS-disabled public tables.
select n.nspname as schema_name, c.relname as relation_name,
       c.relkind, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
       has_table_privilege('authenticated', c.oid, 'SELECT') as signed_in_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as signed_in_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as signed_in_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') as signed_in_delete,
       c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
order by c.relrowsecurity, c.relname;

-- 2. Actual policies, including broad USING (true) / WITH CHECK (true).
select schemaname, tablename, policyname, permissive, roles, cmd,
       qual as using_expression, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 3. Privileged RPC functions. Public executability is a review signal, not
-- automatic proof of a flaw: some functions enforce ownership in their bodies.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as signed_in_execute,
       (select setting from unnest(p.proconfig) as setting
        where setting like 'search_path=%' limit 1) as configured_search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by anon_execute desc, signed_in_execute desc, function_name;

-- 4. Profile creation and protection triggers: verify deployed versions exist.
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       t.tgenabled, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and ((n.nspname = 'auth' and c.relname = 'users')
       or (n.nspname = 'public' and c.relname = 'profiles'))
order by n.nspname, c.relname, t.tgname;

-- 5. Public storage buckets. Public assets may be intentional; private account
-- uploads should not be placed in a public bucket.
select id, name, public from storage.buckets order by name;

commit;
