-- BK & Tata Tertib: katalog poin, catatan kejadian (pelanggaran/prestasi), dan sesi konseling.
--
-- Akses:
--   * semua staf dapat membaca & mencatat kejadian (guru melaporkan di kelasnya);
--   * mengubah/menghapus catatan: pelapor sendiri atau pengelola BK;
--   * katalog poin & sesi konseling (rahasia): hanya pengelola BK
--     (jabatan BK, pimpinan sekolah/unit, wakasek, atau peran pengelola);
--   * orang tua membaca catatan anaknya yang dibagikan (visibility = 'parents').

create or replace function public.is_counseling_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(array['super_admin','ketua_yayasan','kepsek','wakasek','admin_sekolah','admin_unit'])
      or exists (
        select 1 from public.employees e
        where e.user_id = auth.uid() and e.status = 'active'
          and e.position in ('bk','kepala_sekolah','kepala_unit','wakasek_kesiswaan','wakasek_umum')
      );
$$;
grant execute on function public.is_counseling_manager() to authenticated;

create table if not exists public.conduct_rules (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade,
  kind text not null check (kind in ('violation', 'achievement')),
  category text not null,
  name text not null,
  points integer not null check (points > 0 and points <= 1000),
  severity text not null default 'ringan' check (severity in ('ringan', 'sedang', 'berat')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conduct_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  rule_id uuid references public.conduct_rules(id) on delete set null,
  kind text not null check (kind in ('violation', 'achievement')),
  title text not null,
  points integer not null default 0 check (points >= 0 and points <= 1000),
  incident_date date not null default current_date,
  description text,
  follow_up text,
  status text not null default 'open' check (status in ('open', 'followed_up', 'closed')),
  visibility text not null default 'parents' check (visibility in ('internal', 'parents')),
  class_id uuid references public.classes(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  reported_by uuid references public.employees(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.counseling_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  counselor_id uuid references public.employees(id) on delete set null,
  conduct_record_id uuid references public.conduct_records(id) on delete set null,
  session_date date not null default current_date,
  session_type text not null default 'individual'
    check (session_type in ('individual', 'group', 'parent_meeting', 'home_visit', 'referral')),
  topic text not null,
  confidential_notes text,
  agreed_actions text,
  next_session_date date,
  status text not null default 'done' check (status in ('scheduled', 'done', 'cancelled')),
  parent_notified boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conduct_records_student_idx on public.conduct_records(student_id, incident_date desc);
create index if not exists conduct_records_class_idx on public.conduct_records(class_id, incident_date desc);
create index if not exists conduct_records_year_idx on public.conduct_records(academic_year_id, kind);
create index if not exists counseling_sessions_student_idx on public.counseling_sessions(student_id, session_date desc);
create index if not exists conduct_rules_unit_idx on public.conduct_rules(unit_id, kind, is_active);

-- Snapshot class/unit/year and reporter so history stays correct after promotions.
create or replace function public.conduct_record_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.class_id is null then
    select s.class_id into new.class_id from public.students s where s.id = new.student_id;
  end if;
  if new.unit_id is null then
    select s.unit_id into new.unit_id from public.students s where s.id = new.student_id;
  end if;
  if new.academic_year_id is null and new.class_id is not null then
    select c.academic_year_id into new.academic_year_id from public.classes c where c.id = new.class_id;
  end if;
  if new.reported_by is null then new.reported_by := public.current_employee_id(); end if;
  if new.rule_id is not null and (new.title is null or new.title = '') then
    select r.name into new.title from public.conduct_rules r where r.id = new.rule_id;
  end if;
  return new;
end;
$$;
drop trigger if exists conduct_record_defaults on public.conduct_records;
create trigger conduct_record_defaults before insert on public.conduct_records
  for each row execute function public.conduct_record_defaults();

create or replace function public.conduct_touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
drop trigger if exists conduct_rules_touch on public.conduct_rules;
create trigger conduct_rules_touch before update on public.conduct_rules for each row execute function public.conduct_touch_updated_at();
drop trigger if exists conduct_records_touch on public.conduct_records;
create trigger conduct_records_touch before update on public.conduct_records for each row execute function public.conduct_touch_updated_at();
drop trigger if exists counseling_sessions_touch on public.counseling_sessions;
create trigger counseling_sessions_touch before update on public.counseling_sessions for each row execute function public.conduct_touch_updated_at();

-- Per-student point totals (security_invoker: callers only see rows RLS lets them see).
create or replace view public.student_conduct_summary with (security_invoker = true) as
select
  r.student_id,
  r.academic_year_id,
  coalesce(sum(r.points) filter (where r.kind = 'violation'), 0)::int as violation_points,
  coalesce(sum(r.points) filter (where r.kind = 'achievement'), 0)::int as achievement_points,
  count(*) filter (where r.kind = 'violation')::int as violation_count,
  count(*) filter (where r.kind = 'achievement')::int as achievement_count,
  count(*) filter (where r.status = 'open' and r.kind = 'violation')::int as open_cases,
  max(r.incident_date) as last_incident_date
from public.conduct_records r
group by r.student_id, r.academic_year_id;
grant select on public.student_conduct_summary to authenticated;

alter table public.conduct_rules enable row level security;
alter table public.conduct_records enable row level security;
alter table public.counseling_sessions enable row level security;

drop policy if exists "Staff read conduct rules" on public.conduct_rules;
create policy "Staff read conduct rules" on public.conduct_rules for select to authenticated using (public.is_school_staff());
drop policy if exists "Counseling managers manage conduct rules" on public.conduct_rules;
create policy "Counseling managers manage conduct rules" on public.conduct_rules for all to authenticated
  using (public.is_counseling_manager()) with check (public.is_counseling_manager());

drop policy if exists "Staff read conduct records" on public.conduct_records;
create policy "Staff read conduct records" on public.conduct_records for select to authenticated using (public.is_school_staff());
drop policy if exists "Staff report conduct records" on public.conduct_records;
create policy "Staff report conduct records" on public.conduct_records for insert to authenticated with check (public.is_school_staff());
drop policy if exists "Reporter or counselor updates conduct records" on public.conduct_records;
create policy "Reporter or counselor updates conduct records" on public.conduct_records for update to authenticated
  using (public.is_counseling_manager() or reported_by = public.current_employee_id())
  with check (public.is_counseling_manager() or reported_by = public.current_employee_id());
drop policy if exists "Reporter or counselor deletes conduct records" on public.conduct_records;
create policy "Reporter or counselor deletes conduct records" on public.conduct_records for delete to authenticated
  using (public.is_counseling_manager() or reported_by = public.current_employee_id());
drop policy if exists "Parents read shared conduct records" on public.conduct_records;
create policy "Parents read shared conduct records" on public.conduct_records for select to authenticated
  using (visibility = 'parents' and public.is_parent_of_student(student_id));

drop policy if exists "Counseling managers manage sessions" on public.counseling_sessions;
create policy "Counseling managers manage sessions" on public.counseling_sessions for all to authenticated
  using (public.is_counseling_manager()) with check (public.is_counseling_manager());

grant select, insert, update, delete on public.conduct_rules, public.conduct_records, public.counseling_sessions to authenticated;
revoke all on public.conduct_rules, public.conduct_records, public.counseling_sessions from anon;

-- In-app notification to parents when a shared record is created.
alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications add constraint notifications_category_check
  check (category in ('announcement', 'report', 'payment', 'leave', 'task', 'conduct'));

create or replace function public.notify_conduct_recorded()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  student_name text;
begin
  if new.visibility <> 'parents' then return new; end if;
  select full_name into student_name from public.students where id = new.student_id;
  perform public.notify_users(public.parent_user_ids(array[new.student_id]), 'conduct', 'recorded', new.id,
    case when new.kind = 'achievement' then 'Prestasi ' || coalesce(student_name, 'ananda') else 'Catatan tata tertib ' || coalesce(student_name, 'ananda') end,
    new.title || case when new.points > 0 then ' (' || new.points || ' poin)' else '' end,
    '/portal/conduct');
  return new;
exception when others then
  raise warning 'notify_conduct_recorded: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_conduct_recorded on public.conduct_records;
create trigger notify_conduct_recorded after insert on public.conduct_records
  for each row execute function public.notify_conduct_recorded();

-- Starter catalogue (global; schools can edit or deactivate). Only seeded when empty.
insert into public.conduct_rules (kind, category, name, points, severity)
select * from (values
  ('violation', 'Kedisiplinan', 'Terlambat masuk sekolah', 5, 'ringan'),
  ('violation', 'Kedisiplinan', 'Tidak mengikuti pelajaran tanpa izin', 10, 'sedang'),
  ('violation', 'Kedisiplinan', 'Tidak mengerjakan tugas berulang kali', 5, 'ringan'),
  ('violation', 'Kerapian', 'Seragam/atribut tidak sesuai ketentuan', 5, 'ringan'),
  ('violation', 'Akhlak', 'Berkata kasar atau tidak sopan', 10, 'sedang'),
  ('violation', 'Akhlak', 'Mengganggu atau merundung teman', 25, 'berat'),
  ('violation', 'Akhlak', 'Berkelahi', 30, 'berat'),
  ('violation', 'Ketertiban', 'Membawa/menggunakan gawai tanpa izin', 10, 'sedang'),
  ('violation', 'Ketertiban', 'Merusak fasilitas sekolah', 25, 'berat'),
  ('violation', 'Kejujuran', 'Menyontek saat asesmen', 20, 'sedang'),
  ('achievement', 'Akademik', 'Juara lomba tingkat sekolah', 10, 'ringan'),
  ('achievement', 'Akademik', 'Juara lomba tingkat kota/kabupaten', 20, 'sedang'),
  ('achievement', 'Akademik', 'Juara lomba tingkat provinsi/nasional', 40, 'berat'),
  ('achievement', 'Keagamaan', 'Menyelesaikan target hafalan', 10, 'ringan'),
  ('achievement', 'Karakter', 'Menjadi teladan / membantu sesama', 5, 'ringan')
) as seed(kind, category, name, points, severity)
where not exists (select 1 from public.conduct_rules);

notify pgrst, 'reload schema';
