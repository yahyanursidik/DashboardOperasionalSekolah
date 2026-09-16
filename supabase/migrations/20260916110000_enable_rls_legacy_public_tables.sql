-- Legacy tables were created after the initial RLS setup. Their policies are
-- already defined by the hardening migrations; this restores the RLS switch
-- so those policies are actually enforced by the Supabase API.
alter table public.admin_tasks enable row level security;
alter table public.attendance_records enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.announcements enable row level security;

-- Security-advisor audit query (read-only) for future public tables:
-- select n.nspname as schema_name, c.relname as table_name
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where c.relkind = 'r' and n.nspname = 'public' and not c.relrowsecurity
-- order by c.relname;
