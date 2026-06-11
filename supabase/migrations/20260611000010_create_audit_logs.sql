-- Create Audit Logs Schema

DROP TABLE IF EXISTS public.audit_logs;
CREATE TABLE public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null check (action in ('create', 'update', 'delete', 'status-change')),
  resource_name text not null,
  resource_id text not null, -- using text to accommodate UUIDs and integer IDs safely
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now() not null
);

-- RLS
alter table public.audit_logs enable row level security;

-- Super Admin and Kepsek can view all audit logs
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
      and r.name in ('super_admin', 'kepsek')
    )
  );

-- All authenticated users can insert audit logs (via the app provider)
create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);
