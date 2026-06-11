-- Create Announcements Schema

CREATE TABLE public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  target_type text not null check (target_type in ('all', 'unit', 'class', 'staff', 'parents')),
  unit_id uuid references public.units(id),
  class_id uuid references public.classes(id),
  status text not null check (status in ('draft', 'menunggu_approval', 'terjadwal', 'terkirim', 'dibatalkan')) default 'draft',
  publish_at timestamptz,
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
