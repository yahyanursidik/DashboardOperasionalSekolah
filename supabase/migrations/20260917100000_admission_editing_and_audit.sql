-- Controlled correction workflow for SPMB data. Parents retain access to their
-- own draft/revision records, while admissions managers may correct records at
-- every stage. Sensitive values are never copied into the audit log.

create table if not exists public.admission_applicant_edit_logs (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.admissions_applicants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('parent','admin','system')),
  changed_fields text[] not null check (cardinality(changed_fields) > 0),
  created_at timestamptz not null default now()
);

create index if not exists admission_applicant_edit_logs_applicant_created_idx
  on public.admission_applicant_edit_logs(applicant_id, created_at desc);

alter table public.admission_applicant_edit_logs enable row level security;

drop policy if exists "Admissions managers read applicant edit logs" on public.admission_applicant_edit_logs;
create policy "Admissions managers read applicant edit logs"
on public.admission_applicant_edit_logs for select to authenticated
using (exists (
  select 1 from public.admissions_applicants applicant
  where applicant.id = applicant_id and public.admission_is_manager(applicant.unit_id)
));

drop policy if exists "Applicants read own edit logs" on public.admission_applicant_edit_logs;
create policy "Applicants read own edit logs"
on public.admission_applicant_edit_logs for select to authenticated
using (exists (
  select 1 from public.admissions_applicants applicant
  where applicant.id = applicant_id and applicant.user_id = auth.uid()
));

grant select on public.admission_applicant_edit_logs to authenticated;

-- Parent browser clients never control workflow, admission result, enrollment,
-- or the financial approval snapshot. They may revise the target and tariff
-- request only while the application is still a draft.
create or replace function public.admission_guard_parent_data_edit()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  protected_after_draft text[] := array[
    'unit_id','academic_year_id','batch_id','desired_class_id','desired_grade',
    'entry_type','registration_fee_category','staff_employee_nik'
  ];
  server_only text[] := array[
    'id','user_id','registration_number','registration_date','created_at','updated_at','updated_by',
    'unit','academic_year','status','score','workflow_status','submitted_at','verified_at','decided_at','decision_notes','assigned_to',
    'accepted_class_id','student_id','archived_at','registration_fee_amount',
    'registration_fee_rule_id','registration_fee_snapshot_at','staff_fee_status',
    'staff_employee_id','staff_fee_review_note','staff_fee_reviewed_at','staff_fee_reviewed_by'
  ];
  column_name text;
begin
  if auth.uid() is null or public.admission_is_manager(old.unit_id) then
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then
    raise exception 'Anda hanya dapat memperbarui pendaftaran milik akun sendiri.';
  end if;
  if old.workflow_status not in ('draft','documents_review') then
    raise exception 'Data pendaftaran sedang diproses. Hubungi panitia untuk koreksi.';
  end if;

  foreach column_name in array server_only loop
    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception 'Kolom % hanya dapat diubah oleh panitia.', column_name;
    end if;
  end loop;
  if old.workflow_status <> 'draft' then
    foreach column_name in array protected_after_draft loop
      if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
        raise exception 'Tujuan pendaftaran dan kategori biaya hanya dapat diubah saat masih draf.';
      end if;
    end loop;
  end if;
  return new;
end; $$;

drop trigger if exists admission_guard_parent_data_edit on public.admissions_applicants;
create trigger admission_guard_parent_data_edit
before update on public.admissions_applicants
for each row execute function public.admission_guard_parent_data_edit();

create or replace function public.admission_log_data_edit()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  watched_fields text[] := array[
    'name','child_nickname','nik','nisn','gender','birth_place','dob','previous_school',
    'parent_name','parent_phone','parent_email','parent_occupation','parent_education_level',
    'second_parent_name','second_parent_phone','second_parent_occupation','second_parent_education_level',
    'family_card_number','address','domicile_regency','domicile_province',
    'emergency_contact_name','emergency_contact_phone','emergency_contact_relation','home_language','allergies','medical_notes',
    'toilet_independence','onsite_transport_plan','pickup_contact_name','pickup_contact_phone','pickup_contact_relation',
    'residence_country','learning_timezone','hbl_facilitator_name','hbl_facilitator_relation','hbl_device_ready','hbl_internet_ready','hbl_preferred_session','learning_support_notes',
    'admission_profile','desired_class_id','desired_grade','entry_type','registration_fee_category','staff_employee_nik'
  ];
  changed text[] := array[]::text[];
  column_name text;
  kind text;
begin
  foreach column_name in array watched_fields loop
    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      changed := array_append(changed, column_name);
    end if;
  end loop;
  if cardinality(changed) = 0 then return null; end if;

  kind := case
    when auth.uid() is null then 'system'
    when public.admission_is_manager(new.unit_id) then 'admin'
    when new.user_id = auth.uid() then 'parent'
    else 'system'
  end;
  insert into public.admission_applicant_edit_logs(applicant_id, actor_id, actor_kind, changed_fields)
  values(new.id, auth.uid(), kind, changed);
  return null;
end; $$;

drop trigger if exists admission_log_data_edit on public.admissions_applicants;
create trigger admission_log_data_edit
after update on public.admissions_applicants
for each row execute function public.admission_log_data_edit();

-- These functions are trigger-only and must not be callable as public RPCs.
revoke all on function public.admission_guard_parent_data_edit() from public;
revoke all on function public.admission_log_data_edit() from public;

notify pgrst, 'reload schema';
