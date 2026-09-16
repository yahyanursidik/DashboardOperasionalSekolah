-- Guided SPMB submission: parent data is drafted first, then the database
-- accepts the final submission only after documents and payment are present.

alter table public.admissions_applicants
  add column if not exists child_nickname text,
  add column if not exists parent_occupation text,
  add column if not exists second_parent_name text,
  add column if not exists second_parent_phone text,
  add column if not exists second_parent_occupation text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relation text,
  add column if not exists home_language text,
  add column if not exists allergies text,
  add column if not exists medical_notes text,
  add column if not exists toilet_independence text check (toilet_independence is null or toilet_independence in ('independent','with_support','not_applicable')),
  add column if not exists pickup_contact_name text,
  add column if not exists pickup_contact_phone text,
  add column if not exists pickup_contact_relation text,
  add column if not exists onsite_transport_plan text check (onsite_transport_plan is null or onsite_transport_plan in ('parent','school_transport','other')),
  add column if not exists hbl_facilitator_name text,
  add column if not exists hbl_facilitator_relation text,
  add column if not exists hbl_device_ready boolean,
  add column if not exists hbl_internet_ready boolean,
  add column if not exists hbl_preferred_session text,
  add column if not exists learning_support_notes text;

create table if not exists public.admission_announcements (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  batch_id uuid references public.admission_batches(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 3 and 5000),
  priority text not null default 'normal' check (priority in ('normal','important')),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or published_at is null or expires_at > published_at)
);

create index if not exists admission_announcements_portal_idx on public.admission_announcements(unit_id, academic_year_id, batch_id, status, published_at desc);

create or replace function public.admission_announcement_audit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'draft' then new.published_at := null; end if;
  return new;
end; $$;

drop trigger if exists admission_announcement_audit on public.admission_announcements;
create trigger admission_announcement_audit before insert or update on public.admission_announcements
for each row execute function public.admission_announcement_audit();

alter table public.admission_announcements enable row level security;
drop policy if exists "Admissions managers manage announcements" on public.admission_announcements;
create policy "Admissions managers manage announcements" on public.admission_announcements for all to authenticated
using (public.admission_is_manager(unit_id)) with check (public.admission_is_manager(unit_id));
drop policy if exists "Applicants read scoped published announcements" on public.admission_announcements;
create policy "Applicants read scoped published announcements" on public.admission_announcements for select to authenticated
using (
  status = 'published'
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from public.admissions_applicants a
    where a.user_id = auth.uid() and a.archived_at is null
      and a.unit_id = admission_announcements.unit_id
      and a.academic_year_id = admission_announcements.academic_year_id
      and (admission_announcements.batch_id is null or admission_announcements.batch_id = a.batch_id)
  )
);

-- Parents cannot change workflow status themselves. The only exception is the
-- controlled finalization RPC below, which performs all prerequisite checks.
create or replace function public.admission_protect_parent_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.admission_is_manager(new.unit_id)
     or current_setting('app.admission_finalizing', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.workflow_status := 'draft';
    new.submitted_at := null;
    return new;
  end if;
  if new.workflow_status is distinct from old.workflow_status then
    raise exception 'Status pendaftaran hanya dapat dikirim melalui proses finalisasi.';
  end if;
  return new;
end; $$;

drop trigger if exists admission_protect_parent_workflow on public.admissions_applicants;
create trigger admission_protect_parent_workflow
before insert or update on public.admissions_applicants
for each row execute function public.admission_protect_parent_workflow();

-- Browser form controls represent an unselected optional value as an empty
-- string, while the constrained columns intentionally accept NULL. Normalize
-- that boundary on the server as well so older portal bundles cannot violate
-- the database constraints.
create or replace function public.admission_normalize_optional_values()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.toilet_independence := nullif(btrim(coalesce(new.toilet_independence, '')), '');
  new.onsite_transport_plan := nullif(btrim(coalesce(new.onsite_transport_plan, '')), '');
  new.residence_country := nullif(btrim(coalesce(new.residence_country, '')), '');
  new.learning_timezone := nullif(btrim(coalesce(new.learning_timezone, '')), '');
  new.staff_employee_nik := nullif(btrim(coalesce(new.staff_employee_nik, '')), '');
  return new;
end; $$;

drop trigger if exists admission_normalize_optional_values on public.admissions_applicants;
create trigger admission_normalize_optional_values
before insert or update on public.admissions_applicants
for each row execute function public.admission_normalize_optional_values();

create or replace function public.admission_submit_application(p_applicant_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; required_docs text[] := array['family_card','birth_certificate','parent_id_card','photo']; missing_docs text[]; program_name text; is_hbl boolean; is_preschool boolean; is_elementary boolean;
begin
  select app.*
    into a
  from public.admissions_applicants app
  where app.id = p_applicant_id and app.user_id = auth.uid() and app.archived_at is null for update;
  if a.id is null then raise exception 'Pendaftaran tidak ditemukan atau tidak dapat dikirim.'; end if;
  select lower(concat_ws(' ', a.unit, u.name, c.name))
    into program_name
  from public.units u
  left join public.classes c on c.id = a.desired_class_id
  where u.id = a.unit_id;
  program_name := coalesce(program_name, lower(coalesce(a.unit, '')));
  if a.workflow_status <> 'draft' and a.workflow_status <> 'documents_review' then raise exception 'Pendaftaran ini sudah dikirim atau sedang diproses panitia.'; end if;
  if nullif(btrim(coalesce(a.name,'')), '') is null or nullif(btrim(coalesce(a.nik,'')), '') is null or a.dob is null
     or nullif(btrim(coalesce(a.parent_name,'')), '') is null or nullif(btrim(coalesce(a.parent_phone,'')), '') is null
     or nullif(btrim(coalesce(a.address,'')), '') is null or nullif(btrim(coalesce(a.emergency_contact_name,'')), '') is null
     or nullif(btrim(coalesce(a.emergency_contact_phone,'')), '') is null then
    raise exception 'Data calon murid, kontak orang tua, alamat, dan kontak darurat harus dilengkapi.';
  end if;
  is_hbl := program_name ~ '(\mhbl\M|home[ -]?based learning|online|daring)';
  is_preschool := program_name ~ '(preschool|paud|playgroup|kelompok bermain|taman kanak|\mtk\M)';
  is_elementary := program_name ~ '(elementary|\msd\M|sekolah dasar)';
  if a.entry_type = 'transfer' then required_docs := array_append(required_docs, 'transfer_letter'); end if;
  if a.entry_type = 'transfer' or is_elementary then required_docs := array_append(required_docs, 'previous_report'); end if;
  if is_preschool then required_docs := array_append(required_docs, 'health_record'); end if;
  if is_hbl then
    required_docs := array_append(required_docs, 'home_learning_commitment');
    if nullif(btrim(coalesce(a.residence_country,'')), '') is null or nullif(btrim(coalesce(a.learning_timezone,'')), '') is null
       or nullif(btrim(coalesce(a.hbl_facilitator_name,'')), '') is null or nullif(btrim(coalesce(a.hbl_facilitator_relation,'')), '') is null
       or coalesce(a.hbl_device_ready,false) = false or coalesce(a.hbl_internet_ready,false) = false then
      raise exception 'Data domisili, zona waktu, pendamping, perangkat, dan internet HBL harus dilengkapi.';
    end if;
  elsif is_preschool and coalesce(a.toilet_independence,'') = '' then
    raise exception 'Kesiapan ke toilet perlu diisi untuk Preschool Regular.';
  end if;
  select coalesce(array_agg(r.document_type), array[]::text[]) into missing_docs
  from unnest(required_docs) as r(document_type)
  where not exists (select 1 from public.admission_documents d where d.applicant_id=a.id and d.document_type=r.document_type and d.status in ('submitted','valid'));
  if cardinality(missing_docs) > 0 then raise exception 'Berkas wajib belum diunggah: %.', array_to_string(missing_docs, ', '); end if;
  if a.registration_fee_amount is null then raise exception 'Biaya pendaftaran belum ditentukan atau pengajuan tarif staf masih diproses.'; end if;
  if a.registration_fee_amount > 0 and not exists (select 1 from public.admission_payments p where p.applicant_id=a.id and p.payment_type='registration' and p.status in ('submitted','verified','waived')) then
    raise exception 'Bukti pembayaran pendaftaran belum diunggah.';
  end if;
  perform set_config('app.admission_finalizing', 'on', true);
  update public.admissions_applicants set workflow_status='submitted', submitted_at=coalesce(submitted_at, now()), updated_at=now(), updated_by=auth.uid() where id=a.id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by) values(a.id,a.workflow_status,'submitted','Dikirim oleh orang tua/wali setelah kelengkapan tahap awal.',auth.uid());
end; $$;

grant select,insert,update,delete on public.admission_announcements to authenticated;
grant execute on function public.admission_submit_application(uuid) to authenticated;
notify pgrst, 'reload schema';
