-- SPMB recovery and class-level capacity planning.
-- Idempotent because several deployments predate the complete SPMB schema.

create table if not exists public.admission_batches (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  registration_start_at timestamptz not null,
  registration_end_at timestamptz not null,
  quota integer check (quota is null or quota > 0),
  registration_fee numeric(14,2) not null default 0 check (registration_fee >= 0),
  status text not null default 'draft' check (status in ('draft','published','closed')),
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
  add column if not exists desired_class_id uuid references public.classes(id) on delete set null,
  add column if not exists entry_type text not null default 'new',
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
  'draft','submitted','documents_review','verified','assessment_scheduled','assessed','accepted','waitlisted','rejected','enrolled','withdrawn'
));
alter table public.admissions_applicants drop constraint if exists admissions_applicants_entry_type_check;
alter table public.admissions_applicants add constraint admissions_applicants_entry_type_check check (entry_type in ('new','transfer'));

create table if not exists public.admission_documents (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  document_type text not null, file_url text not null, file_name text,
  status text not null default 'submitted' check (status in ('submitted','valid','revision_required','rejected')),
  review_note text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (applicant_id, document_type)
);
create table if not exists public.admission_payments (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  payment_type text not null default 'registration', amount numeric(14,2) not null check (amount >= 0), proof_url text, paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending','submitted','verified','rejected','waived')),
  verification_note text, verified_by uuid references auth.users(id) on delete set null, verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (applicant_id, payment_type)
);
create table if not exists public.admission_assessments (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('observation','academic_test','quran','interview','psychology')),
  scheduled_at timestamptz, location text, assessor_id uuid references public.employees(id) on delete set null,
  score numeric(6,2), result text check (result is null or result in ('pending','recommended','considered','not_recommended')),
  notes text, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (applicant_id, assessment_type)
);
create table if not exists public.admission_checklist_responses (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  checklist_type text not null, responses jsonb not null default '{}'::jsonb, submitted_at timestamptz, reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (applicant_id, checklist_type)
);
create table if not exists public.admission_status_history (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  from_status text, to_status text not null, note text, changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.admission_settings (
  id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade, contact_name text, contact_phone text,
  required_documents text[] not null default array['family_card','birth_certificate','photo']::text[], selection_policy text,
  announcement_message text, is_public boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (unit_id, academic_year_id)
);

create table if not exists public.admission_quota_plans (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.admission_batches(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  entry_type text not null default 'new' check (entry_type in ('new','transfer')),
  quota integer not null check (quota > 0),
  allow_waitlist boolean not null default true,
  is_open boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, class_id, entry_type)
);

create index if not exists admission_quota_scope_idx on public.admission_quota_plans(batch_id,class_id,entry_type);
create index if not exists admission_applicant_quota_idx on public.admissions_applicants(batch_id,desired_class_id,entry_type,workflow_status) where archived_at is null;

create or replace function public.admission_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role('super_admin') or public.has_role('ketua_yayasan') or public.has_role('kepsek')
    or public.has_role('wakasek') or public.has_role('kepala_tu') or public.has_role('admin_tu')
    or public.has_role('admin_sekolah') or public.has_role('admin_spmb')
    or (public.has_role('admin_unit') and (target_unit_id is null or public.can_access_unit(target_unit_id)));
$$;

create sequence if not exists public.admission_registration_number_seq;
create or replace function public.set_admission_registration_number()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.registration_number is null or btrim(new.registration_number)='' then
    new.registration_number := 'SPMB-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.admission_registration_number_seq')::text,5,'0');
  end if;
  return new;
end; $$;
drop trigger if exists set_admission_registration_number on public.admissions_applicants;
create trigger set_admission_registration_number before insert on public.admissions_applicants for each row execute function public.set_admission_registration_number();

create or replace function public.validate_admission_target()
returns trigger language plpgsql set search_path=public as $$
declare v_batch public.admission_batches; v_class public.classes; v_plan public.admission_quota_plans;
begin
  if new.batch_id is null or new.desired_class_id is null then return new; end if;
  select * into v_batch from public.admission_batches where id=new.batch_id;
  select * into v_class from public.classes where id=new.desired_class_id;
  if v_batch.id is null or v_class.id is null or v_batch.unit_id<>v_class.unit_id or v_batch.academic_year_id<>v_class.academic_year_id then
    raise exception 'Kelas tujuan tidak sesuai unit dan tahun ajaran gelombang.';
  end if;
  select * into v_plan from public.admission_quota_plans where batch_id=new.batch_id and class_id=new.desired_class_id and entry_type=new.entry_type;
  if v_plan.id is null or not v_plan.is_open then raise exception 'Kuota tujuan pendaftaran belum dibuka oleh panitia.'; end if;
  new.unit_id:=v_batch.unit_id; new.academic_year_id:=v_batch.academic_year_id; new.desired_grade:=v_class.grade_level;
  return new;
end; $$;
drop trigger if exists validate_admission_target on public.admissions_applicants;
create trigger validate_admission_target before insert or update of batch_id,desired_class_id,entry_type on public.admissions_applicants for each row execute function public.validate_admission_target();

create or replace function public.admission_quota_snapshot(p_batch_id uuid default null)
returns table(quota_id uuid,batch_id uuid,batch_name text,unit_id uuid,unit_name text,academic_year_id uuid,academic_year_name text,class_id uuid,class_name text,grade_level integer,entry_type text,quota integer,applicant_count bigint,reserved_count bigint,enrolled_count bigint,waiting_count bigint,remaining_count integer,allow_waitlist boolean,is_open boolean,batch_status text)
language sql stable security definer set search_path=public as $$
  select q.id,b.id,b.name,b.unit_id,u.name,b.academic_year_id,y.name,c.id,c.name,c.grade_level,q.entry_type,q.quota,
    count(a.id) filter(where a.workflow_status not in ('draft','rejected','withdrawn')),
    count(a.id) filter(where a.workflow_status in ('accepted','enrolled')),
    count(a.id) filter(where a.workflow_status='enrolled'),
    count(a.id) filter(where a.workflow_status='waitlisted'),
    greatest(q.quota-count(a.id) filter(where a.workflow_status in ('accepted','enrolled')),0)::integer,
    q.allow_waitlist,q.is_open,b.status
  from public.admission_quota_plans q join public.admission_batches b on b.id=q.batch_id
  join public.units u on u.id=b.unit_id join public.academic_years y on y.id=b.academic_year_id join public.classes c on c.id=q.class_id
  left join public.admissions_applicants a on a.batch_id=q.batch_id and a.desired_class_id=q.class_id and a.entry_type=q.entry_type and a.archived_at is null
  where (p_batch_id is null or b.id=p_batch_id) and public.admission_is_manager(b.unit_id)
  group by q.id,b.id,u.name,y.name,c.id;
$$;

create or replace function public.admission_public_quota_options()
returns table(quota_id uuid,batch_id uuid,batch_name text,unit_id uuid,unit_name text,academic_year_id uuid,academic_year_name text,class_id uuid,class_name text,grade_level integer,entry_type text,quota integer,applicant_count bigint,reserved_count bigint,remaining_count integer,allow_waitlist boolean,is_open boolean,registration_start_at timestamptz,registration_end_at timestamptz,registration_fee numeric)
language sql stable security definer set search_path=public as $$
  select q.id,b.id,b.name,b.unit_id,u.name,b.academic_year_id,y.name,c.id,c.name,c.grade_level,q.entry_type,q.quota,
    count(a.id) filter(where a.workflow_status not in ('draft','rejected','withdrawn')),
    count(a.id) filter(where a.workflow_status in ('accepted','enrolled')),
    greatest(q.quota-count(a.id) filter(where a.workflow_status in ('accepted','enrolled')),0)::integer,
    q.allow_waitlist,q.is_open,b.registration_start_at,b.registration_end_at,b.registration_fee
  from public.admission_quota_plans q join public.admission_batches b on b.id=q.batch_id
  join public.units u on u.id=b.unit_id join public.academic_years y on y.id=b.academic_year_id join public.classes c on c.id=q.class_id
  left join public.admissions_applicants a on a.batch_id=q.batch_id and a.desired_class_id=q.class_id and a.entry_type=q.entry_type and a.archived_at is null
  where b.status='published' and q.is_open
  group by q.id,b.id,u.name,y.name,c.id;
$$;

create or replace function public.admission_assert_available(p_applicant_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; q public.admission_quota_plans; target_class public.classes; used integer; class_used integer;
begin
  select * into a from public.admissions_applicants where id=p_applicant_id for update;
  select * into q from public.admission_quota_plans where batch_id=a.batch_id and class_id=a.desired_class_id and entry_type=a.entry_type for update;
  if q.id is null or not q.is_open then raise exception 'Kuota kelas dan jalur pendaftaran belum aktif.'; end if;
  select count(*) into used from public.admissions_applicants x where x.batch_id=q.batch_id and x.desired_class_id=q.class_id and x.entry_type=q.entry_type and x.workflow_status in ('accepted','enrolled') and x.id<>a.id and x.archived_at is null;
  if used>=q.quota then raise exception 'Kuota kelas untuk jalur ini sudah penuh. Pindahkan pendaftar ke daftar tunggu atau tambah kuota secara resmi.'; end if;
  select * into target_class from public.classes where id=q.class_id for update;
  select count(*) into class_used from public.admissions_applicants x where x.desired_class_id=q.class_id and x.workflow_status in ('accepted','enrolled') and x.id<>a.id and x.archived_at is null;
  if target_class.capacity is not null and class_used>=target_class.capacity then raise exception 'Kapasitas kelas sudah penuh pada seluruh gelombang. Pindahkan pendaftar ke daftar tunggu.'; end if;
end; $$;

drop function if exists public.admission_save_batch_with_quotas(uuid,jsonb,jsonb);
create or replace function public.admission_save_batch_with_quotas(
  p_batch_id uuid default null,
  p_batch jsonb default '{}'::jsonb,
  p_quotas jsonb default '[]'::jsonb,
  p_policy jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_batch_id uuid:=p_batch_id; v_unit_id uuid; v_year_id uuid; v_row jsonb; v_class public.classes;
  v_quota integer; v_entry_type text; v_reserved integer; v_new_quota integer; v_transfer_quota integer;
begin
  v_unit_id:=(p_batch->>'unit_id')::uuid; v_year_id:=(p_batch->>'academic_year_id')::uuid;
  if v_unit_id is null or v_year_id is null or not public.admission_is_manager(v_unit_id) then raise exception 'Unit pendaftaran tidak dapat dikelola.'; end if;
  if jsonb_array_length(p_quotas)=0 then raise exception 'Isi sedikitnya satu kuota kelas.'; end if;
  if (p_batch->>'registration_end_at')::timestamptz <= (p_batch->>'registration_start_at')::timestamptz then raise exception 'Waktu penutupan harus setelah pembukaan.'; end if;

  if v_batch_id is null then
    insert into public.admission_batches(unit_id,academic_year_id,name,registration_start_at,registration_end_at,registration_fee,status,announcement_at,notes)
    values(v_unit_id,v_year_id,btrim(p_batch->>'name'),(p_batch->>'registration_start_at')::timestamptz,(p_batch->>'registration_end_at')::timestamptz,
      coalesce((p_batch->>'registration_fee')::numeric,0),coalesce(nullif(p_batch->>'status',''),'draft'),nullif(p_batch->>'announcement_at','')::timestamptz,nullif(p_batch->>'notes',''))
    returning id into v_batch_id;
  else
    if not exists(select 1 from public.admission_batches b where b.id=v_batch_id and public.admission_is_manager(b.unit_id)) then raise exception 'Gelombang tidak ditemukan atau tidak dapat dikelola.'; end if;
    update public.admission_batches set unit_id=v_unit_id,academic_year_id=v_year_id,name=btrim(p_batch->>'name'),
      registration_start_at=(p_batch->>'registration_start_at')::timestamptz,registration_end_at=(p_batch->>'registration_end_at')::timestamptz,
      registration_fee=coalesce((p_batch->>'registration_fee')::numeric,0),status=coalesce(nullif(p_batch->>'status',''),'draft'),
      announcement_at=nullif(p_batch->>'announcement_at','')::timestamptz,notes=nullif(p_batch->>'notes',''),updated_at=now()
    where id=v_batch_id;
  end if;

  for v_row in select value from jsonb_array_elements(p_quotas) loop
    select * into v_class from public.classes where id=(v_row->>'class_id')::uuid;
    if v_class.id is null or v_class.unit_id<>v_unit_id or v_class.academic_year_id<>v_year_id then raise exception 'Ada kelas kuota yang tidak sesuai unit atau tahun ajaran.'; end if;
    v_entry_type:=v_row->>'entry_type'; v_quota:=coalesce((v_row->>'quota')::integer,0);
    if v_entry_type not in ('new','transfer') then raise exception 'Jalur masuk tidak valid.'; end if;
    select count(*) into v_reserved from public.admissions_applicants a where a.batch_id=v_batch_id and a.desired_class_id=v_class.id and a.entry_type=v_entry_type and a.workflow_status in ('accepted','enrolled') and a.archived_at is null;
    if v_quota=0 then
      if v_reserved>0 then raise exception 'Kuota % % sudah memiliki % kursi terisi dan tidak dapat dihapus.',v_class.name,v_entry_type,v_reserved; end if;
      delete from public.admission_quota_plans where batch_id=v_batch_id and class_id=v_class.id and entry_type=v_entry_type;
    else
      if v_quota<v_reserved then raise exception 'Kuota % % tidak boleh lebih kecil dari % kursi yang sudah terisi.',v_class.name,v_entry_type,v_reserved; end if;
      insert into public.admission_quota_plans(batch_id,class_id,entry_type,quota,allow_waitlist,is_open,notes)
      values(v_batch_id,v_class.id,v_entry_type,v_quota,coalesce((v_row->>'allow_waitlist')::boolean,true),coalesce((v_row->>'is_open')::boolean,true),nullif(v_row->>'notes',''))
      on conflict(batch_id,class_id,entry_type) do update set quota=excluded.quota,allow_waitlist=excluded.allow_waitlist,is_open=excluded.is_open,notes=excluded.notes,updated_at=now();
    end if;
  end loop;

  for v_class in select c.* from public.classes c where c.unit_id=v_unit_id and c.academic_year_id=v_year_id loop
    select coalesce(max(q.quota) filter(where q.entry_type='new'),0),coalesce(max(q.quota) filter(where q.entry_type='transfer'),0)
      into v_new_quota,v_transfer_quota from public.admission_quota_plans q where q.batch_id=v_batch_id and q.class_id=v_class.id;
    if v_class.capacity is not null and v_new_quota+v_transfer_quota>v_class.capacity then
      raise exception 'Total kuota siswa baru dan pindahan untuk % melebihi kapasitas kelas (%).',v_class.name,v_class.capacity;
    end if;
  end loop;
  if p_policy<>'{}'::jsonb then
    insert into public.admission_settings(unit_id,academic_year_id,contact_name,contact_phone,selection_policy,announcement_message,is_public)
    values(v_unit_id,v_year_id,nullif(p_policy->>'contact_name',''),nullif(p_policy->>'contact_phone',''),nullif(p_policy->>'selection_policy',''),nullif(p_policy->>'announcement_message',''),coalesce((p_policy->>'is_public')::boolean,true))
    on conflict(unit_id,academic_year_id) do update set contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,selection_policy=excluded.selection_policy,announcement_message=excluded.announcement_message,is_public=excluded.is_public,updated_at=now();
  end if;
  return v_batch_id;
end; $$;

create or replace function public.admission_prepare_target_classes(
  p_unit_id uuid,
  p_academic_year_id uuid,
  p_source_academic_year_id uuid default null
)
returns integer language plpgsql security definer set search_path=public as $$
declare v_source_year_id uuid:=p_source_academic_year_id; v_inserted integer:=0; v_level text;
begin
  if p_unit_id is null or p_academic_year_id is null or not public.admission_is_manager(p_unit_id) then raise exception 'Unit dan tahun ajaran tidak dapat dikelola.'; end if;
  if not exists(select 1 from public.academic_years where id=p_academic_year_id) then raise exception 'Tahun ajaran tujuan tidak ditemukan.'; end if;
  if v_source_year_id is null then
    select c.academic_year_id into v_source_year_id from public.classes c join public.academic_years y on y.id=c.academic_year_id
    where c.unit_id=p_unit_id and c.academic_year_id<>p_academic_year_id group by c.academic_year_id,y.start_date order by y.start_date desc limit 1;
  end if;
  if v_source_year_id is not null then
    insert into public.classes(unit_id,academic_year_id,name,grade_level,capacity,created_by,updated_by)
    select p_unit_id,p_academic_year_id,c.name,c.grade_level,c.capacity,auth.uid(),auth.uid() from public.classes c
    where c.unit_id=p_unit_id and c.academic_year_id=v_source_year_id
      and not exists(select 1 from public.classes target where target.unit_id=p_unit_id and target.academic_year_id=p_academic_year_id and lower(target.name)=lower(c.name));
    get diagnostics v_inserted=row_count;
  else
    select education_level into v_level from public.units where id=p_unit_id;
    if v_level='preschool' then
      insert into public.classes(unit_id,academic_year_id,name,grade_level,capacity,created_by,updated_by)
      select p_unit_id,p_academic_year_id,name,0,null,auth.uid(),auth.uid() from (values('Taman Kanak-Kanak A'),('Taman Kanak-Kanak B')) seed(name)
      where not exists(select 1 from public.classes target where target.unit_id=p_unit_id and target.academic_year_id=p_academic_year_id and lower(target.name)=lower(seed.name));
    elsif v_level='elementary' then
      insert into public.classes(unit_id,academic_year_id,name,grade_level,capacity,created_by,updated_by)
      select p_unit_id,p_academic_year_id,'Kelas '||grade,grade,null,auth.uid(),auth.uid() from generate_series(1,6) grade
      where not exists(select 1 from public.classes target where target.unit_id=p_unit_id and target.academic_year_id=p_academic_year_id and target.grade_level=grade);
    else
      raise exception 'Belum ada struktur kelas sumber. Buat kelas pada Data Kelas terlebih dahulu.';
    end if;
    get diagnostics v_inserted=row_count;
  end if;
  return v_inserted;
end; $$;

-- Preserve the existing workflow function while enforcing the allocated seat at acceptance.
create or replace function public.admission_transition(p_applicant_id uuid,p_to_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; allowed boolean:=false; required_docs text[]; missing_docs integer;
begin
  select * into a from public.admissions_applicants where id=p_applicant_id for update;
  if a.id is null or not public.admission_is_manager(a.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat diakses.'; end if;
  if p_to_status='accepted' then perform public.admission_assert_available(a.id); end if;
  if p_to_status='verified' then
    select coalesce(s.required_documents,array['family_card','birth_certificate','photo']::text[]) into required_docs from public.admission_settings s where s.unit_id=a.unit_id and s.academic_year_id=a.academic_year_id limit 1;
    required_docs:=coalesce(required_docs,array['family_card','birth_certificate','photo']::text[]);
    if a.entry_type='transfer' then required_docs:=array_append(required_docs,'transfer_letter'); end if;
    select count(*) into missing_docs from unnest(required_docs) d(document_type) where not exists(select 1 from public.admission_documents x where x.applicant_id=a.id and x.document_type=d.document_type and x.status='valid');
    if missing_docs>0 then raise exception 'Masih ada % dokumen wajib yang belum valid.',missing_docs; end if;
  end if;
  allowed:=case a.workflow_status
    when 'draft' then p_to_status in ('submitted','withdrawn') when 'submitted' then p_to_status in ('documents_review','verified','rejected','withdrawn')
    when 'documents_review' then p_to_status in ('verified','submitted','rejected') when 'verified' then p_to_status in ('assessment_scheduled','accepted','rejected')
    when 'assessment_scheduled' then p_to_status in ('assessed','verified','rejected') when 'assessed' then p_to_status in ('accepted','waitlisted','rejected')
    when 'waitlisted' then p_to_status in ('accepted','rejected','withdrawn') when 'accepted' then p_to_status in ('enrolled','withdrawn') else false end;
  if not allowed then raise exception 'Perubahan status dari % ke % tidak diizinkan.',a.workflow_status,p_to_status; end if;
  update public.admissions_applicants set workflow_status=p_to_status,verified_at=case when p_to_status='verified' then now() else verified_at end,
    decided_at=case when p_to_status in ('accepted','waitlisted','rejected') then now() else decided_at end,
    decision_notes=case when p_to_status in ('accepted','waitlisted','rejected') then p_note else decision_notes end,updated_by=auth.uid() where id=a.id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by) values(a.id,a.workflow_status,p_to_status,p_note,auth.uid());
end; $$;

alter table public.students add column if not exists class_id uuid references public.classes(id) on delete set null;

create or replace function public.admission_enroll_student(p_applicant_id uuid,p_nis text,p_class_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; v_student_id uuid; v_parent_id uuid; target_class public.classes; fee numeric; active_students integer;
begin
  select * into a from public.admissions_applicants where id=p_applicant_id for update;
  if a.id is null or not public.admission_is_manager(a.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat diakses.'; end if;
  if a.workflow_status<>'accepted' then raise exception 'Hanya pendaftar diterima yang dapat dijadikan siswa.'; end if;
  if a.student_id is not null then return a.student_id; end if;
  if p_class_id is null or p_class_id is distinct from a.desired_class_id then raise exception 'Kelas daftar ulang harus sama dengan kelas tujuan yang telah diterima.'; end if;
  perform public.admission_assert_available(a.id);
  select * into target_class from public.classes where id=p_class_id for update;
  if target_class.id is null or target_class.unit_id is distinct from a.unit_id or target_class.academic_year_id is distinct from a.academic_year_id then raise exception 'Kelas tidak sesuai unit atau tahun ajaran pendaftar.'; end if;
  select count(*) into active_students from public.students where class_id=p_class_id and status='active';
  if target_class.capacity is not null and active_students>=target_class.capacity then raise exception 'Kapasitas rombongan belajar sudah penuh. Perbarui kelas atau pilih tindak lanjut lain.'; end if;
  select coalesce(registration_fee,0) into fee from public.admission_batches where id=a.batch_id;
  if coalesce(fee,0)>0 and not exists(select 1 from public.admission_payments where applicant_id=a.id and payment_type='registration' and status in ('verified','waived')) then raise exception 'Pembayaran pendaftaran belum terverifikasi.'; end if;
  insert into public.students(nis,nisn,full_name,unit_id,class_id,status,gender,date_of_birth,created_by,updated_by)
  values(p_nis,a.nisn,a.name,a.unit_id,p_class_id,'active',coalesce(a.gender,'L'),a.dob,auth.uid(),auth.uid()) returning id into v_student_id;
  select id into v_parent_id from public.parents where user_id=a.user_id limit 1;
  if v_parent_id is null then
    insert into public.parents(user_id,full_name,phone,email,address,created_by,updated_by)
    values(a.user_id,coalesce(a.parent_name,'Orang Tua / Wali'),a.parent_phone,a.parent_email,a.address,auth.uid(),auth.uid()) returning id into v_parent_id;
  end if;
  insert into public.student_parent_links(student_id,parent_id,relationship,is_primary) values(v_student_id,v_parent_id,'guardian',true) on conflict(student_id,parent_id) do nothing;
  update public.admissions_applicants set workflow_status='enrolled',student_id=v_student_id,accepted_class_id=p_class_id,updated_by=auth.uid() where id=a.id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by) values(a.id,'accepted','enrolled','Dikonversi menjadi siswa aktif.',auth.uid());
  return v_student_id;
end; $$;

create or replace function public.sync_admission_legacy_status()
returns trigger language plpgsql set search_path=public as $$
begin
  new.status:=case new.workflow_status when 'draft' then 'Draf' when 'submitted' then 'Menunggu Verifikasi' when 'documents_review' then 'Berkas Lengkap' when 'verified' then 'Verifikasi Valid' when 'assessment_scheduled' then 'Jadwal Seleksi' when 'assessed' then 'Selesai Seleksi' when 'accepted' then 'Lulus Tes' when 'waitlisted' then 'Daftar Tunggu' when 'rejected' then 'Ditolak' when 'enrolled' then 'Menjadi Siswa' when 'withdrawn' then 'Mengundurkan Diri' else new.status end;
  return new;
end; $$;
drop trigger if exists sync_admission_legacy_status on public.admissions_applicants;
create trigger sync_admission_legacy_status before insert or update of workflow_status on public.admissions_applicants for each row execute function public.sync_admission_legacy_status();

alter table public.admission_quota_plans enable row level security;
alter table public.admissions_applicants enable row level security;
alter table public.admission_batches enable row level security;
alter table public.admission_documents enable row level security;
alter table public.admission_payments enable row level security;
alter table public.admission_assessments enable row level security;
alter table public.admission_checklist_responses enable row level security;
alter table public.admission_status_history enable row level security;
alter table public.admission_settings enable row level security;

drop policy if exists "Admissions managers manage applicants" on public.admissions_applicants;
create policy "Admissions managers manage applicants" on public.admissions_applicants for all to authenticated using(public.admission_is_manager(unit_id)) with check(public.admission_is_manager(unit_id));
drop policy if exists "Applicants view own application" on public.admissions_applicants;
create policy "Applicants view own application" on public.admissions_applicants for select to authenticated using(user_id=auth.uid());
drop policy if exists "Applicants create own application" on public.admissions_applicants;
create policy "Applicants create own application" on public.admissions_applicants for insert to authenticated with check(user_id=auth.uid() and workflow_status in ('draft','submitted'));
drop policy if exists "Applicants update own application" on public.admissions_applicants;
create policy "Applicants update own application" on public.admissions_applicants for update to authenticated using(user_id=auth.uid() and workflow_status in ('draft','submitted','documents_review')) with check(user_id=auth.uid() and workflow_status in ('draft','submitted','documents_review'));

drop policy if exists "Public views published admission batches" on public.admission_batches;
create policy "Public views published admission batches" on public.admission_batches for select to anon,authenticated using(status='published');
drop policy if exists "Admissions managers manage batches" on public.admission_batches;
create policy "Admissions managers manage batches" on public.admission_batches for all to authenticated using(public.admission_is_manager(unit_id)) with check(public.admission_is_manager(unit_id));
drop policy if exists "Public views admission settings" on public.admission_settings;
create policy "Public views admission settings" on public.admission_settings for select to anon,authenticated using(is_public);
drop policy if exists "Admissions managers manage settings" on public.admission_settings;
create policy "Admissions managers manage settings" on public.admission_settings for all to authenticated using(public.admission_is_manager(unit_id)) with check(public.admission_is_manager(unit_id));

do $$ declare t text; begin
  foreach t in array array['admission_documents','admission_payments','admission_assessments','admission_checklist_responses','admission_status_history'] loop
    execute format('drop policy if exists "Admissions managers manage %s" on public.%I',t,t);
    execute format('create policy "Admissions managers manage %s" on public.%I for all to authenticated using(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and public.admission_is_manager(a.unit_id))) with check(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and public.admission_is_manager(a.unit_id)))',t,t);
    execute format('drop policy if exists "Applicants view own %s" on public.%I',t,t);
    execute format('create policy "Applicants view own %s" on public.%I for select to authenticated using(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()))',t,t);
  end loop;
end $$;
drop policy if exists "Applicants manage own documents" on public.admission_documents;
create policy "Applicants manage own documents" on public.admission_documents for insert to authenticated with check(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and a.workflow_status in ('draft','submitted','documents_review')));
drop policy if exists "Applicants update own documents" on public.admission_documents;
create policy "Applicants update own documents" on public.admission_documents for update to authenticated using(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and a.workflow_status in ('draft','submitted','documents_review')));
drop policy if exists "Applicants manage own payments" on public.admission_payments;
create policy "Applicants manage own payments" on public.admission_payments for insert to authenticated with check(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));
drop policy if exists "Applicants update own payments" on public.admission_payments;
create policy "Applicants update own payments" on public.admission_payments for update to authenticated using(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid() and status in ('pending','rejected')));
drop policy if exists "Applicants manage own checklist" on public.admission_checklist_responses;
create policy "Applicants manage own checklist" on public.admission_checklist_responses for insert to authenticated with check(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));
drop policy if exists "Applicants update own checklist" on public.admission_checklist_responses;
create policy "Applicants update own checklist" on public.admission_checklist_responses for update to authenticated using(exists(select 1 from public.admissions_applicants a where a.id=applicant_id and a.user_id=auth.uid()));
drop policy if exists "Public views published admission quotas" on public.admission_quota_plans;
create policy "Public views published admission quotas" on public.admission_quota_plans for select to anon,authenticated using (is_open and exists(select 1 from public.admission_batches b where b.id=batch_id and b.status='published'));
drop policy if exists "Admissions managers manage quotas" on public.admission_quota_plans;
create policy "Admissions managers manage quotas" on public.admission_quota_plans for all to authenticated using (exists(select 1 from public.admission_batches b where b.id=batch_id and public.admission_is_manager(b.unit_id))) with check (exists(select 1 from public.admission_batches b where b.id=batch_id and public.admission_is_manager(b.unit_id)));

grant select,insert,update,delete on public.admission_batches,public.admission_documents,public.admission_payments,public.admission_assessments,public.admission_checklist_responses,public.admission_status_history,public.admission_settings,public.admission_quota_plans to authenticated;
grant select on public.admission_batches,public.admission_settings,public.admission_quota_plans to anon;
grant usage,select on sequence public.admission_registration_number_seq to authenticated;
grant execute on function public.admission_public_quota_options() to anon,authenticated;
grant execute on function public.admission_quota_snapshot(uuid) to authenticated;
grant execute on function public.admission_transition(uuid,text,text) to authenticated;
grant execute on function public.admission_enroll_student(uuid,text,uuid) to authenticated;
grant execute on function public.admission_save_batch_with_quotas(uuid,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.admission_prepare_target_classes(uuid,uuid,uuid) to authenticated;

notify pgrst,'reload schema';
