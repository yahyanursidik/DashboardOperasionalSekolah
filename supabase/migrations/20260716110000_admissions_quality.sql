create table if not exists public.admissions_applicants (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique,
  name text not null,
  nik text,
  dob date,
  academic_year text,
  unit text,
  previous_school text,
  parent_name text,
  parent_phone text,
  status text not null default 'Menunggu Verifikasi',
  score numeric,
  registration_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admission_batches (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  registration_start_at timestamptz not null,
  registration_end_at timestamptz not null,
  quota integer check (quota is null or quota > 0),
  registration_fee numeric(14,2) not null default 0 check (registration_fee >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  announcement_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, academic_year_id, name),
  check (registration_end_at > registration_start_at)
);

alter table public.admissions_applicants
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists academic_year_id uuid references public.academic_years(id) on delete set null,
  add column if not exists batch_id uuid references public.admission_batches(id) on delete set null,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists desired_grade integer,
  add column if not exists gender text,
  add column if not exists birth_place text,
  add column if not exists address text,
  add column if not exists parent_email text,
  add column if not exists family_card_number text,
  add column if not exists nisn text,
  add column if not exists submitted_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_notes text,
  add column if not exists accepted_class_id uuid references public.classes(id) on delete set null,
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists assigned_to uuid references public.employees(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz;

alter table public.admissions_applicants drop constraint if exists admissions_applicants_workflow_status_check;
alter table public.admissions_applicants add constraint admissions_applicants_workflow_status_check check (workflow_status in (
  'draft', 'submitted', 'documents_review', 'verified', 'assessment_scheduled', 'assessed',
  'accepted', 'waitlisted', 'rejected', 'enrolled', 'withdrawn'
));
alter table public.admissions_applicants drop constraint if exists admissions_applicants_gender_check;
alter table public.admissions_applicants add constraint admissions_applicants_gender_check check (gender is null or gender in ('L', 'P'));
alter table public.admissions_applicants drop constraint if exists admissions_applicants_grade_check;
alter table public.admissions_applicants add constraint admissions_applicants_grade_check check (desired_grade is null or desired_grade between 0 and 12);

update public.admissions_applicants set workflow_status = case
  when status in ('Lulus Tes', 'Diterima') then 'accepted'
  when status = 'Ditolak' then 'rejected'
  when status = 'Verifikasi Valid' then 'verified'
  when status = 'Berkas Lengkap' then 'documents_review'
  else case when submitted_at is not null then 'submitted' else 'draft' end
end where workflow_status = 'draft' and status is not null;

create table if not exists public.admission_documents (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  file_name text,
  status text not null default 'submitted' check (status in ('submitted', 'valid', 'revision_required', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, document_type)
);

create table if not exists public.admission_payments (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  payment_type text not null default 'registration',
  amount numeric(14,2) not null check (amount >= 0),
  proof_url text,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'verified', 'rejected', 'waived')),
  verification_note text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, payment_type)
);

create table if not exists public.admission_assessments (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('observation', 'academic_test', 'quran', 'interview', 'psychology')),
  scheduled_at timestamptz,
  location text,
  assessor_id uuid references public.employees(id) on delete set null,
  score numeric(6,2),
  result text check (result is null or result in ('pending', 'recommended', 'considered', 'not_recommended')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, assessment_type)
);

create table if not exists public.admission_checklist_responses (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  checklist_type text not null,
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, checklist_type)
);

create table if not exists public.admission_status_history (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admission_settings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  contact_name text,
  contact_phone text,
  required_documents text[] not null default array['family_card', 'birth_certificate', 'photo']::text[],
  selection_policy text,
  announcement_message text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, academic_year_id)
);

create index if not exists admissions_applicants_scope_idx on public.admissions_applicants (academic_year_id, unit_id, workflow_status, registration_date desc);
create index if not exists admissions_applicants_user_idx on public.admissions_applicants (user_id, registration_date desc);
create index if not exists admission_documents_review_idx on public.admission_documents (status, applicant_id);
create index if not exists admission_payments_review_idx on public.admission_payments (status, applicant_id);
create index if not exists admission_assessments_schedule_idx on public.admission_assessments (scheduled_at, result);
create index if not exists admission_history_applicant_idx on public.admission_status_history (applicant_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['admissions_applicants','admission_batches','admission_documents','admission_payments','admission_assessments','admission_checklist_responses','admission_settings'] loop
    execute format('drop trigger if exists set_updated_at_%I on public.%I', table_name, table_name);
    execute format('create trigger set_updated_at_%I before update on public.%I for each row execute procedure public.handle_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.admission_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin') or public.has_role('ketua_yayasan') or public.has_role('kepsek')
    or public.has_role('wakasek') or public.has_role('kepala_tu') or public.has_role('admin_tu')
    or public.has_role('admin_sekolah') or public.has_role('admin_spmb')
    or (public.has_role('admin_unit') and (target_unit_id is null or public.can_access_unit(target_unit_id)));
$$;

create or replace function public.set_admission_registration_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.registration_number is null or btrim(new.registration_number) = '' then
    new.registration_number := 'SPMB-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.admission_registration_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create sequence if not exists public.admission_registration_number_seq;
drop trigger if exists set_admission_registration_number on public.admissions_applicants;
create trigger set_admission_registration_number before insert on public.admissions_applicants
for each row execute procedure public.set_admission_registration_number();

create or replace function public.sync_admission_legacy_status()
returns trigger language plpgsql set search_path = public as $$
begin
  new.status := case new.workflow_status
    when 'draft' then 'Draf'
    when 'submitted' then 'Menunggu Verifikasi'
    when 'documents_review' then 'Berkas Lengkap'
    when 'verified' then 'Verifikasi Valid'
    when 'assessment_scheduled' then 'Jadwal Seleksi'
    when 'assessed' then 'Selesai Seleksi'
    when 'accepted' then 'Lulus Tes'
    when 'waitlisted' then 'Daftar Tunggu'
    when 'rejected' then 'Ditolak'
    when 'enrolled' then 'Menjadi Siswa'
    when 'withdrawn' then 'Mengundurkan Diri'
    else new.status end;
  return new;
end;
$$;
drop trigger if exists sync_admission_legacy_status on public.admissions_applicants;
create trigger sync_admission_legacy_status before insert or update of workflow_status on public.admissions_applicants
for each row execute procedure public.sync_admission_legacy_status();

create or replace function public.record_initial_admission_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by)
  values (new.id,null,new.workflow_status,'Pendaftaran dibuat.',auth.uid());
  return new;
end;
$$;
drop trigger if exists record_initial_admission_status on public.admissions_applicants;
create trigger record_initial_admission_status after insert on public.admissions_applicants
for each row execute procedure public.record_initial_admission_status();

create or replace function public.admission_transition(p_applicant_id uuid, p_to_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare applicant public.admissions_applicants; allowed boolean := false; required_docs text[]; missing_documents integer;
begin
  select * into applicant from public.admissions_applicants where id = p_applicant_id for update;
  if applicant.id is null or not public.admission_is_manager(applicant.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat diakses.'; end if;
  if p_to_status = 'verified' then
    select coalesce(s.required_documents,array['family_card','birth_certificate','photo']::text[])
      into required_docs from public.admission_settings s
      where s.unit_id=applicant.unit_id and s.academic_year_id=applicant.academic_year_id limit 1;
    required_docs := coalesce(required_docs,array['family_card','birth_certificate','photo']::text[]);
    select count(*) into missing_documents from unnest(required_docs) required(document_type)
      where not exists (select 1 from public.admission_documents d where d.applicant_id=applicant.id and d.document_type=required.document_type and d.status='valid');
    if missing_documents > 0 then raise exception 'Masih ada % dokumen wajib yang belum valid.', missing_documents; end if;
  end if;
  allowed := case applicant.workflow_status
    when 'draft' then p_to_status in ('submitted','withdrawn')
    when 'submitted' then p_to_status in ('documents_review','verified','rejected','withdrawn')
    when 'documents_review' then p_to_status in ('verified','submitted','rejected')
    when 'verified' then p_to_status in ('assessment_scheduled','accepted','rejected')
    when 'assessment_scheduled' then p_to_status in ('assessed','verified','rejected')
    when 'assessed' then p_to_status in ('accepted','waitlisted','rejected')
    when 'waitlisted' then p_to_status in ('accepted','rejected','withdrawn')
    when 'accepted' then p_to_status in ('enrolled','withdrawn')
    else false end;
  if not allowed then raise exception 'Perubahan status dari % ke % tidak diizinkan.', applicant.workflow_status, p_to_status; end if;
  update public.admissions_applicants set workflow_status = p_to_status,
    verified_at = case when p_to_status = 'verified' then now() else verified_at end,
    decided_at = case when p_to_status in ('accepted','waitlisted','rejected') then now() else decided_at end,
    decision_notes = case when p_to_status in ('accepted','waitlisted','rejected') then p_note else decision_notes end,
    updated_by = auth.uid() where id = p_applicant_id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by)
  values (p_applicant_id,applicant.workflow_status,p_to_status,p_note,auth.uid());
end;
$$;

create or replace function public.admission_enroll_student(p_applicant_id uuid, p_nis text, p_class_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare applicant public.admissions_applicants; new_student_id uuid; parent_id uuid; class_unit_id uuid; class_year_id uuid; v_registration_fee numeric;
begin
  select * into applicant from public.admissions_applicants where id = p_applicant_id for update;
  if applicant.id is null or not public.admission_is_manager(applicant.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat diakses.'; end if;
  if applicant.workflow_status <> 'accepted' then raise exception 'Hanya pendaftar diterima yang dapat dijadikan siswa.'; end if;
  if applicant.student_id is not null then return applicant.student_id; end if;
  select coalesce(batch.registration_fee,0) into v_registration_fee from public.admission_batches batch where batch.id=applicant.batch_id;
  if coalesce(v_registration_fee,0) > 0 and not exists (
    select 1 from public.admission_payments where applicant_id=applicant.id and payment_type='registration' and status in ('verified','waived')
  ) then raise exception 'Pembayaran pendaftaran belum terverifikasi.'; end if;
  if p_class_id is not null then
    select unit_id,academic_year_id into class_unit_id,class_year_id from public.classes where id = p_class_id;
    if class_unit_id is distinct from applicant.unit_id or class_year_id is distinct from applicant.academic_year_id then raise exception 'Kelas tidak sesuai unit atau tahun ajaran pendaftar.'; end if;
  end if;
  insert into public.students(nis,nisn,full_name,unit_id,class_id,status,gender,date_of_birth,created_by,updated_by)
  values (p_nis,applicant.nisn,applicant.name,applicant.unit_id,p_class_id,'active',coalesce(applicant.gender,'L'),applicant.dob,auth.uid(),auth.uid())
  returning id into new_student_id;
  select id into parent_id from public.parents where user_id = applicant.user_id limit 1;
  if parent_id is null then
    insert into public.parents(user_id,full_name,phone,email,address,created_by,updated_by)
    values (applicant.user_id,coalesce(applicant.parent_name,'Orang Tua / Wali'),applicant.parent_phone,applicant.parent_email,applicant.address,auth.uid(),auth.uid()) returning id into parent_id;
  end if;
  insert into public.student_parent_links(student_id,parent_id,relationship,is_primary)
  values (new_student_id,parent_id,'guardian',true) on conflict (student_id,parent_id) do nothing;
  update public.admissions_applicants set workflow_status='enrolled',student_id=new_student_id,accepted_class_id=p_class_id,updated_by=auth.uid() where id=p_applicant_id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by)
  values (p_applicant_id,'accepted','enrolled','Dikonversi menjadi siswa aktif.',auth.uid());
  return new_student_id;
end;
$$;

alter table public.admissions_applicants enable row level security;
alter table public.admission_batches enable row level security;
alter table public.admission_documents enable row level security;
alter table public.admission_payments enable row level security;
alter table public.admission_assessments enable row level security;
alter table public.admission_checklist_responses enable row level security;
alter table public.admission_status_history enable row level security;
alter table public.admission_settings enable row level security;

drop policy if exists "Admissions managers manage applicants" on public.admissions_applicants;
create policy "Admissions managers manage applicants" on public.admissions_applicants for all to authenticated using (public.admission_is_manager(unit_id)) with check (public.admission_is_manager(unit_id));
drop policy if exists "Applicants manage own application" on public.admissions_applicants;
drop policy if exists "Applicants view own application" on public.admissions_applicants;
create policy "Applicants view own application" on public.admissions_applicants for select to authenticated using (user_id=auth.uid());
drop policy if exists "Applicants create own application" on public.admissions_applicants;
create policy "Applicants create own application" on public.admissions_applicants for insert to authenticated with check (user_id=auth.uid() and workflow_status in ('draft','submitted'));
drop policy if exists "Applicants update own application" on public.admissions_applicants;
create policy "Applicants update own application" on public.admissions_applicants for update to authenticated using (user_id=auth.uid() and workflow_status in ('draft','submitted','documents_review')) with check (user_id=auth.uid() and workflow_status in ('draft','submitted','documents_review'));
drop policy if exists "Finance views admission applicants" on public.admissions_applicants;
create policy "Finance views admission applicants" on public.admissions_applicants for select to authenticated using (public.finance_can_access_unit(unit_id));

drop policy if exists "Public views published admission batches" on public.admission_batches;
create policy "Public views published admission batches" on public.admission_batches for select to anon,authenticated using (status='published');
drop policy if exists "Admissions managers manage batches" on public.admission_batches;
create policy "Admissions managers manage batches" on public.admission_batches for all to authenticated using (public.admission_is_manager(unit_id)) with check (public.admission_is_manager(unit_id));

drop policy if exists "Public views admission settings" on public.admission_settings;
create policy "Public views admission settings" on public.admission_settings for select to anon,authenticated using (is_public);
drop policy if exists "Admissions managers manage settings" on public.admission_settings;
create policy "Admissions managers manage settings" on public.admission_settings for all to authenticated using (public.admission_is_manager(unit_id)) with check (public.admission_is_manager(unit_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['admission_documents','admission_payments','admission_assessments','admission_checklist_responses','admission_status_history'] loop
    execute format('drop policy if exists "Admissions managers manage %s" on public.%I', table_name, table_name);
    execute format('create policy "Admissions managers manage %s" on public.%I for all to authenticated using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and public.admission_is_manager(a.unit_id))) with check (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and public.admission_is_manager(a.unit_id)))', table_name, table_name);
    execute format('drop policy if exists "Applicants view own %s" on public.%I', table_name, table_name);
    execute format('create policy "Applicants view own %s" on public.%I for select to authenticated using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()))', table_name, table_name);
  end loop;
end $$;

drop policy if exists "Applicants manage own documents" on public.admission_documents;
create policy "Applicants manage own documents" on public.admission_documents for insert to authenticated with check (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and a.workflow_status in ('draft','submitted','documents_review')));
drop policy if exists "Applicants update own documents" on public.admission_documents;
create policy "Applicants update own documents" on public.admission_documents for update to authenticated using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and a.workflow_status in ('draft','submitted','documents_review')));
drop policy if exists "Applicants manage own payments" on public.admission_payments;
create policy "Applicants manage own payments" on public.admission_payments for insert to authenticated with check (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));
drop policy if exists "Applicants update own payments" on public.admission_payments;
create policy "Applicants update own payments" on public.admission_payments for update to authenticated using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and status in ('pending','rejected')));
drop policy if exists "Finance verifies admission payments" on public.admission_payments;
create policy "Finance verifies admission payments" on public.admission_payments for all to authenticated
using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and public.finance_can_access_unit(a.unit_id)))
with check (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and public.finance_can_access_unit(a.unit_id)));
drop policy if exists "Applicants manage own checklist" on public.admission_checklist_responses;
create policy "Applicants manage own checklist" on public.admission_checklist_responses for insert to authenticated with check (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));
drop policy if exists "Applicants update own checklist" on public.admission_checklist_responses;
create policy "Applicants update own checklist" on public.admission_checklist_responses for update to authenticated using (exists (select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));

grant select,insert,update,delete on public.admissions_applicants,public.admission_batches,public.admission_documents,public.admission_payments,public.admission_assessments,public.admission_checklist_responses,public.admission_status_history,public.admission_settings to authenticated;
grant select on public.admission_batches,public.admission_settings to anon;
grant usage,select on sequence public.admission_registration_number_seq to authenticated;
grant execute on function public.admission_transition(uuid,text,text) to authenticated;
grant execute on function public.admission_enroll_student(uuid,text,uuid) to authenticated;
grant execute on function public.admission_is_manager(uuid) to authenticated;
