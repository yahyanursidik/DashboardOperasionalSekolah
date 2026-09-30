-- Kolom data pokok yang dibutuhkan Dapodik (peserta didik, orang tua, PTK).
-- Semua kolom opsional agar data lama tetap valid; kelengkapan dipantau di menu Dapodik.
-- Format nomor identitas divalidasi bila diisi (NIK/No. KK 16 digit, NISN 10 digit tidak
-- dipaksakan karena data lama).

alter table public.students
  add column if not exists nik text,
  add column if not exists family_card_number text,
  add column if not exists religion text,
  add column if not exists birth_certificate_number text,
  add column if not exists rt text,
  add column if not exists rw text,
  add column if not exists hamlet text,
  add column if not exists village text,
  add column if not exists district text,
  add column if not exists postal_code text,
  add column if not exists residence_type text,
  add column if not exists transportation text,
  add column if not exists child_order integer,
  add column if not exists siblings_count integer,
  add column if not exists height_cm numeric(5,1),
  add column if not exists weight_kg numeric(5,1),
  add column if not exists head_circumference_cm numeric(5,1),
  add column if not exists distance_to_school_km numeric(6,2),
  add column if not exists previous_school text,
  add column if not exists entry_type text,
  add column if not exists entry_date date,
  add column if not exists kip_number text;

alter table public.students drop constraint if exists students_nik_format_check;
alter table public.students add constraint students_nik_format_check check (nik is null or nik ~ '^[0-9]{16}$');
alter table public.students drop constraint if exists students_family_card_format_check;
alter table public.students add constraint students_family_card_format_check check (family_card_number is null or family_card_number ~ '^[0-9]{16}$');
alter table public.students drop constraint if exists students_child_order_check;
alter table public.students add constraint students_child_order_check check (child_order is null or child_order between 1 and 30);
alter table public.students drop constraint if exists students_entry_type_check;
alter table public.students add constraint students_entry_type_check check (entry_type is null or entry_type in ('siswa_baru', 'pindahan', 'kembali_bersekolah'));

alter table public.parents
  add column if not exists birth_year integer,
  add column if not exists income_range text;
alter table public.parents drop constraint if exists parents_birth_year_check;
alter table public.parents add constraint parents_birth_year_check check (birth_year is null or birth_year between 1920 and 2020);

alter table public.employees
  add column if not exists national_id text,
  add column if not exists nuptk text,
  add column if not exists nip text,
  add column if not exists birth_place text,
  add column if not exists religion text;
-- employees.nik is the portal login identifier (not a KTP number); the KTP NIK lives in national_id.
alter table public.employees drop constraint if exists employees_national_id_format_check;
alter table public.employees add constraint employees_national_id_format_check check (national_id is null or national_id ~ '^[0-9]{16}$');
alter table public.employees drop constraint if exists employees_nuptk_format_check;
alter table public.employees add constraint employees_nuptk_format_check check (nuptk is null or nuptk ~ '^[0-9]{16}$');

comment on column public.students.nik is 'NIK peserta didik (16 digit) sesuai Kartu Keluarga — data pokok Dapodik.';
comment on column public.students.family_card_number is 'Nomor Kartu Keluarga (16 digit).';
comment on column public.employees.national_id is 'NIK KTP pegawai (16 digit) untuk Dapodik; berbeda dari employees.nik yang dipakai login portal.';
comment on column public.employees.nuptk is 'Nomor Unik Pendidik dan Tenaga Kependidikan (16 digit).';

notify pgrst, 'reload schema';
