-- supabase/tests/local_supabase_shims.sql
-- Stand-ins for Supabase's auth.uid()/auth.jwt() and realtime.send() so the
-- engine can be tested in a plain local Postgres. NEVER run this on Supabase.
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
create schema if not exists realtime;
create table if not exists realtime.log (id bigserial primary key, topic text, event text, payload jsonb, private boolean, at timestamptz default now());
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean) returns void language sql as $$ insert into realtime.log(topic, event, payload, private) values (topic, event, payload, private) $$;
-- Realtime authorization: Supabase checks a player's right to a channel by
-- reading realtime.messages as that player, with realtime.topic() set to the
-- channel. These stand-ins let the pvp policies be tested the same way.
create table if not exists realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb);
alter table realtime.messages enable row level security;
create or replace function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
grant usage on schema realtime to authenticated;
grant select, insert on realtime.messages to authenticated;
insert into realtime.messages (topic, extension) select 'probe', 'broadcast' where not exists (select 1 from realtime.messages);
