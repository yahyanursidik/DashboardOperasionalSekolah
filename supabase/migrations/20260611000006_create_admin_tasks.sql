-- Create Admin Tasks Schema

DROP TABLE IF EXISTS public.admin_tasks;
CREATE TABLE public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  unit_id uuid references public.units(id),
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  status text not null check (status in ('belum_mulai', 'diproses', 'menunggu_pihak_lain', 'selesai', 'ditunda')) default 'belum_mulai',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
