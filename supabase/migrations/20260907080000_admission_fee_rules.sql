-- Tarif pendaftaran disimpan per pendaftar supaya perubahan tarif gelombang
-- tidak mengubah tagihan calon murid yang sudah mendaftar.
create table if not exists public.admission_fee_rules (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.admission_batches(id) on delete cascade,
  applicant_category text not null check (applicant_category in ('regular','foundation_staff')),
  amount numeric(14,2),
  is_configured boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(batch_id, applicant_category),
  check ((is_configured = false and amount is null) or (is_configured = true and amount is not null and amount >= 0))
);

alter table public.admissions_applicants
  add column if not exists registration_fee_category text not null default 'regular' check (registration_fee_category in ('regular','foundation_staff')),
  add column if not exists staff_employee_nik text,
  add column if not exists staff_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists staff_fee_status text not null default 'not_applicable' check (staff_fee_status in ('not_applicable','pending','approved','rejected')),
  add column if not exists staff_fee_review_note text,
  add column if not exists staff_fee_reviewed_at timestamptz,
  add column if not exists staff_fee_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists registration_fee_rule_id uuid references public.admission_fee_rules(id) on delete set null,
  add column if not exists registration_fee_amount numeric(14,2) check (registration_fee_amount is null or registration_fee_amount >= 0),
  add column if not exists registration_fee_snapshot_at timestamptz;

-- Tarif lama tetap dipakai sebagai snapshot bagi data historis sampai tarif detail
-- tersedia. Pendaftar baru selalu menggunakan admission_fee_rules.
update public.admissions_applicants a
set registration_fee_amount = b.registration_fee,
    registration_fee_snapshot_at = coalesce(a.registration_fee_snapshot_at, now())
from public.admission_batches b
where b.id = a.batch_id and a.registration_fee_amount is null;

create or replace function public.admission_set_fee_snapshot()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_rule public.admission_fee_rules; v_reviewing boolean := coalesce(current_setting('app.admission_fee_review', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.registration_fee_category = 'foundation_staff' then
      new.staff_fee_status := 'pending';
    else
      new.staff_fee_status := 'not_applicable';
      new.staff_employee_nik := null;
      new.staff_employee_id := null;
    end if;
  elsif not v_reviewing then
    if new.batch_id is distinct from old.batch_id
      or new.registration_fee_category is distinct from old.registration_fee_category
      or (new.registration_fee_category = 'foundation_staff' and new.staff_employee_nik is distinct from old.staff_employee_nik) then
      if new.registration_fee_category = 'foundation_staff' then
        new.staff_fee_status := 'pending';
        new.staff_employee_id := null;
        new.staff_fee_review_note := null;
        new.staff_fee_reviewed_at := null;
        new.staff_fee_reviewed_by := null;
      else
        new.staff_fee_status := 'not_applicable';
        new.staff_employee_nik := null;
        new.staff_employee_id := null;
        new.staff_fee_review_note := null;
        new.staff_fee_reviewed_at := null;
        new.staff_fee_reviewed_by := null;
      end if;
    else
      new.staff_fee_status := old.staff_fee_status;
      new.staff_employee_id := old.staff_employee_id;
      new.staff_fee_review_note := old.staff_fee_review_note;
      new.staff_fee_reviewed_at := old.staff_fee_reviewed_at;
      new.staff_fee_reviewed_by := old.staff_fee_reviewed_by;
      new.registration_fee_rule_id := old.registration_fee_rule_id;
      new.registration_fee_amount := old.registration_fee_amount;
      new.registration_fee_snapshot_at := old.registration_fee_snapshot_at;
      return new;
    end if;
  end if;

  if new.registration_fee_category = 'foundation_staff' and new.staff_fee_status = 'pending' then
    new.registration_fee_rule_id := null;
    new.registration_fee_amount := null;
    new.registration_fee_snapshot_at := now();
    return new;
  end if;

  select * into v_rule
  from public.admission_fee_rules
  where batch_id = new.batch_id
    and applicant_category = case when new.registration_fee_category = 'foundation_staff' and new.staff_fee_status = 'approved' then 'foundation_staff' else 'regular' end;

  if v_rule.id is null then
    -- Menjaga kompatibilitas gelombang lama yang belum pernah dibuka di editor tarif baru.
    new.registration_fee_rule_id := null;
    select registration_fee into new.registration_fee_amount from public.admission_batches where id = new.batch_id;
    new.registration_fee_snapshot_at := now();
    return new;
  end if;
  new.registration_fee_rule_id := v_rule.id;
  new.registration_fee_amount := case when v_rule.is_configured then v_rule.amount else null end;
  new.registration_fee_snapshot_at := now();
  return new;
end; $$;

drop trigger if exists admission_set_fee_snapshot on public.admissions_applicants;
create trigger admission_set_fee_snapshot
before insert or update on public.admissions_applicants
for each row execute function public.admission_set_fee_snapshot();

create or replace function public.admission_review_staff_fee(p_applicant_id uuid, p_approved boolean, p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_applicant public.admissions_applicants; v_employee public.employees;
begin
  select * into v_applicant from public.admissions_applicants where id = p_applicant_id for update;
  if v_applicant.id is null or not public.admission_is_manager(v_applicant.unit_id) then
    raise exception 'Pendaftar tidak ditemukan atau tidak dapat dikelola.';
  end if;
  if v_applicant.registration_fee_category <> 'foundation_staff' then
    raise exception 'Pendaftar ini tidak mengajukan tarif staf yayasan.';
  end if;
  if p_approved then
    select * into v_employee from public.employees where trim(nik) = trim(coalesce(v_applicant.staff_employee_nik, '')) and status = 'active' limit 1;
    if v_employee.id is null then
      raise exception 'NIK pegawai tidak ditemukan atau pegawai sudah tidak aktif.';
    end if;
    if not exists (select 1 from public.admission_fee_rules where batch_id = v_applicant.batch_id and applicant_category = 'foundation_staff' and is_configured) then
      raise exception 'Tarif staf yayasan untuk gelombang ini belum dikonfigurasi.';
    end if;
  end if;
  perform set_config('app.admission_fee_review', 'on', true);
  update public.admissions_applicants
  set staff_fee_status = case when p_approved then 'approved' else 'rejected' end,
      staff_employee_id = case when p_approved then v_employee.id else null end,
      staff_fee_review_note = nullif(btrim(coalesce(p_note, '')), ''),
      staff_fee_reviewed_at = now(), staff_fee_reviewed_by = auth.uid(), updated_at = now()
  where id = v_applicant.id;
  if p_approved and (select registration_fee_amount from public.admissions_applicants where id = v_applicant.id) = 0 then
    insert into public.admission_payments(applicant_id,payment_type,amount,status,verification_note,verified_at,verified_by)
    values(v_applicant.id,'registration',0,'waived','Tarif staf yayasan dibebaskan.',now(),auth.uid())
    on conflict(applicant_id,payment_type) do update set amount=0,status='waived',proof_url=null,paid_at=null,verification_note='Tarif staf yayasan dibebaskan.',verified_at=now(),verified_by=auth.uid();
  end if;
end; $$;

create or replace function public.admission_assert_registration_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_fee numeric; v_status text;
begin
  if new.payment_type <> 'registration' then return new; end if;
  select registration_fee_amount, staff_fee_status into v_fee, v_status from public.admissions_applicants where id = new.applicant_id;
  if v_fee is null then raise exception 'Tarif pendaftaran belum ditentukan atau masih menunggu verifikasi staf.'; end if;
  if new.status = 'waived' then
    if v_fee <> 0 then raise exception 'Pembebasan biaya hanya berlaku bila tarif pendaftar Rp0.'; end if;
    new.amount := 0;
    return new;
  end if;
  if v_fee = 0 then raise exception 'Pendaftar ini dibebaskan dari biaya dan tidak perlu mengunggah bukti transfer.'; end if;
  if new.amount <> v_fee then raise exception 'Nominal pembayaran harus sama dengan tagihan pendaftaran.'; end if;
  return new;
end; $$;

drop trigger if exists admission_assert_registration_payment on public.admission_payments;
create trigger admission_assert_registration_payment
before insert or update on public.admission_payments
for each row execute function public.admission_assert_registration_payment();

-- Daftar ulang mengikuti snapshot tagihan calon murid, bukan nominal gelombang saat ini.
create or replace function public.admission_enroll_student(p_applicant_id uuid,p_nis text,p_class_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; v_student_id uuid; v_parent_id uuid; target_class public.classes; fee numeric; active_students integer;
begin
  select * into a from public.admissions_applicants where id=p_applicant_id for update;
  if a.id is null or not public.admission_is_manager(a.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat dikelola.'; end if;
  if a.workflow_status<>'accepted' then raise exception 'Pendaftar harus berstatus diterima sebelum daftar ulang.'; end if;
  if p_class_id is null then p_class_id:=a.desired_class_id; end if;
  select * into target_class from public.classes where id=p_class_id for update;
  if target_class.id is null or target_class.unit_id is distinct from a.unit_id or target_class.academic_year_id is distinct from a.academic_year_id then raise exception 'Kelas tidak sesuai unit atau tahun ajaran pendaftar.'; end if;
  select count(*) into active_students from public.students where class_id=p_class_id and status='active';
  if target_class.capacity is not null and active_students>=target_class.capacity then raise exception 'Kapasitas rombongan belajar sudah penuh. Perbarui kelas atau pilih tindak lanjut lain.'; end if;
  fee := a.registration_fee_amount;
  if fee is null then raise exception 'Tarif pendaftaran belum ditentukan atau pengajuan tarif staf masih menunggu verifikasi.'; end if;
  if fee > 0 and not exists(select 1 from public.admission_payments where applicant_id=a.id and payment_type='registration' and status in ('verified','waived')) then raise exception 'Pembayaran pendaftaran belum terverifikasi.'; end if;
  insert into public.students(nis,nisn,full_name,unit_id,class_id,status,gender,date_of_birth,created_by,updated_by)
  values(p_nis,a.nisn,a.name,a.unit_id,p_class_id,'active',coalesce(a.gender,'L'),a.dob,auth.uid(),auth.uid()) returning id into v_student_id;
  select id into v_parent_id from public.parents where user_id=a.user_id limit 1;
  if v_parent_id is null then insert into public.parents(user_id,full_name,phone,email,address,created_by,updated_by) values(a.user_id,coalesce(a.parent_name,'Orang Tua / Wali'),a.parent_phone,a.parent_email,a.address,auth.uid(),auth.uid()) returning id into v_parent_id; end if;
  insert into public.student_parent_links(student_id,parent_id,relationship,is_primary) values(v_student_id,v_parent_id,'guardian',true) on conflict(student_id,parent_id) do nothing;
  update public.admissions_applicants set workflow_status='enrolled',student_id=v_student_id,accepted_class_id=p_class_id,updated_by=auth.uid() where id=a.id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by) values(a.id,'accepted','enrolled','Dikonversi menjadi siswa aktif.',auth.uid());
  return v_student_id;
end; $$;

alter table public.admission_fee_rules enable row level security;
drop policy if exists "Admissions managers manage fee rules" on public.admission_fee_rules;
create policy "Admissions managers manage fee rules" on public.admission_fee_rules for all to authenticated
using (exists(select 1 from public.admission_batches b where b.id=batch_id and public.admission_is_manager(b.unit_id)))
with check (exists(select 1 from public.admission_batches b where b.id=batch_id and public.admission_is_manager(b.unit_id)));

grant select,insert,update,delete on public.admission_fee_rules to authenticated;
grant execute on function public.admission_review_staff_fee(uuid,boolean,text), public.admission_enroll_student(uuid,text,uuid) to authenticated;

-- Konfigurasi awal tahun ajaran 2027/2028 sesuai keputusan yayasan.
update public.admission_batches b set registration_fee = 600000
from public.units u where b.unit_id=u.id and lower(u.name) like '%elementary%' and b.name ilike '%gelombang 1%';
update public.admission_batches b set registration_fee = 400000
from public.units u where b.unit_id=u.id and lower(u.name) like '%preschool%' and lower(u.name) not like '%hbl%' and b.name ilike '%gelombang 1%';
update public.admission_batches b set registration_fee = 0
from public.units u where b.unit_id=u.id and lower(u.name) like '%preschool%hbl%' and b.name ilike '%gelombang 1%';

insert into public.admission_fee_rules(batch_id,applicant_category,amount,is_configured,notes)
select b.id,'regular',600000,true,'Tarif umum Elementary School.' from public.admission_batches b join public.units u on u.id=b.unit_id where lower(u.name) like '%elementary%' and b.name ilike '%gelombang 1%'
on conflict(batch_id,applicant_category) do update set amount=excluded.amount,is_configured=true,notes=excluded.notes,updated_at=now();
insert into public.admission_fee_rules(batch_id,applicant_category,amount,is_configured,notes)
select b.id,'foundation_staff',0,true,'Tarif staf yayasan Elementary School Gelombang 1: dibebaskan.' from public.admission_batches b join public.units u on u.id=b.unit_id where lower(u.name) like '%elementary%' and b.name ilike '%gelombang 1%'
on conflict(batch_id,applicant_category) do update set amount=excluded.amount,is_configured=true,notes=excluded.notes,updated_at=now();
insert into public.admission_fee_rules(batch_id,applicant_category,amount,is_configured,notes)
select b.id,'regular',400000,true,'Tarif umum Preschool Regular / Onsite.' from public.admission_batches b join public.units u on u.id=b.unit_id where lower(u.name) like '%preschool%' and lower(u.name) not like '%hbl%' and b.name ilike '%gelombang 1%'
on conflict(batch_id,applicant_category) do update set amount=excluded.amount,is_configured=true,notes=excluded.notes,updated_at=now();
insert into public.admission_fee_rules(batch_id,applicant_category,amount,is_configured,notes)
select b.id,'regular',null,false,'Tarif Preschool Online / HBL belum ditentukan.' from public.admission_batches b join public.units u on u.id=b.unit_id where lower(u.name) like '%preschool%hbl%' and b.name ilike '%gelombang 1%'
on conflict(batch_id,applicant_category) do update set amount=null,is_configured=false,notes=excluded.notes,updated_at=now();

notify pgrst,'reload schema';
