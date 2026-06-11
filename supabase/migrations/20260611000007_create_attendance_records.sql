-- Create Student Attendance Schema

CREATE TABLE public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) not null,
  class_id uuid references public.classes(id) not null,
  unit_id uuid references public.units(id) not null,
  academic_year_id uuid references public.academic_years(id) not null,
  attendance_date date not null,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alpa', 'terlambat', 'pulang_awal')) default 'hadir',
  arrival_time time,
  note text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  UNIQUE(student_id, attendance_date)
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
