-- Integrated school administration: mail registry, disposition, document governance, and retention.

-- The original mail module shipped as a manual SQL script. Keep this migration
-- self-contained so a new environment does not depend on dashboard-side setup.
create table if not exists public.mail_records (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('incoming', 'outgoing', 'internal')),
  mail_number text not null,
  title text not null,
  sender text,
  recipient text,
  mail_date date not null,
  received_date date,
  description text,
  file_url text,
  status text not null default 'logged',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_dispositions (
  id uuid primary key default gen_random_uuid(),
  mail_id uuid not null references public.mail_records(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  instruction text not null,
  due_date date,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.mail_records
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists agenda_number text unique,
  add column if not exists classification_code text,
  add column if not exists confidentiality text not null default 'internal',
  add column if not exists priority text not null default 'normal',
  add column if not exists channel text not null default 'physical',
  add column if not exists response_required boolean not null default false,
  add column if not exists due_date date,
  add column if not exists handled_by_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size integer,
  add column if not exists linked_document_id uuid references public.documents(id) on delete set null,
  add column if not exists physical_location text,
  add column if not exists retention_until date,
  add column if not exists approved_by_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists archived_by_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.mail_records drop constraint if exists mail_records_status_check;
alter table if exists public.mail_records add constraint mail_records_status_check check (status in (
  'logged', 'dispositioned', 'in_progress', 'awaiting_approval', 'approved', 'sent', 'completed', 'archived', 'rejected'
));
alter table if exists public.mail_records drop constraint if exists mail_records_confidentiality_check;
alter table if exists public.mail_records add constraint mail_records_confidentiality_check check (confidentiality in ('public', 'internal', 'confidential', 'restricted'));
alter table if exists public.mail_records drop constraint if exists mail_records_priority_check;
alter table if exists public.mail_records add constraint mail_records_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));
alter table if exists public.mail_records drop constraint if exists mail_records_channel_check;
alter table if exists public.mail_records add constraint mail_records_channel_check check (channel in ('physical', 'email', 'whatsapp', 'courier', 'system', 'other'));

alter table if exists public.mail_dispositions
  alter column from_user_id drop not null,
  alter column to_user_id drop not null,
  add column if not exists from_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists to_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists parent_disposition_id uuid references public.mail_dispositions(id) on delete set null,
  add column if not exists disposition_type text not null default 'follow_up',
  add column if not exists priority text not null default 'normal',
  add column if not exists response_note text,
  add column if not exists evidence_path text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table if exists public.mail_dispositions drop constraint if exists mail_dispositions_status_check;
alter table if exists public.mail_dispositions add constraint mail_dispositions_status_check check (status in ('pending', 'accepted', 'in_progress', 'waiting', 'completed', 'returned'));
alter table if exists public.mail_dispositions drop constraint if exists mail_dispositions_type_check;
alter table if exists public.mail_dispositions add constraint mail_dispositions_type_check check (disposition_type in ('information', 'follow_up', 'represent', 'coordinate', 'file'));
alter table if exists public.mail_dispositions drop constraint if exists mail_dispositions_priority_check;
alter table if exists public.mail_dispositions add constraint mail_dispositions_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));

alter table if exists public.document_types
  add column if not exists classification_code text,
  add column if not exists audience text not null default 'umum',
  add column if not exists retention_years integer not null default 5 check (retention_years >= 0),
  add column if not exists review_frequency_months integer check (review_frequency_months is null or review_frequency_months > 0),
  add column if not exists requires_expiry boolean not null default false,
  add column if not exists default_confidentiality text not null default 'internal';

alter table if exists public.document_types drop constraint if exists document_types_audience_check;
alter table if exists public.document_types add constraint document_types_audience_check check (audience in ('internal', 'eksternal', 'umum'));
alter table if exists public.document_types drop constraint if exists document_types_default_confidentiality_check;
alter table if exists public.document_types add constraint document_types_default_confidentiality_check check (default_confidentiality in ('public', 'internal', 'confidential', 'restricted'));

alter table if exists public.documents
  add column if not exists document_number text,
  add column if not exists document_date date,
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists confidentiality text not null default 'internal',
  add column if not exists effective_date date,
  add column if not exists expiry_date date,
  add column if not exists next_review_date date,
  add column if not exists retention_until date,
  add column if not exists archive_status text not null default 'active',
  add column if not exists physical_location text,
  add column if not exists version_number integer not null default 1 check (version_number > 0),
  add column if not exists parent_document_id uuid references public.documents(id) on delete set null,
  add column if not exists checksum text,
  add column if not exists legal_hold boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.employees(id) on delete set null;

update public.documents set owner_type = 'employee' where owner_type = 'teacher';
alter table if exists public.documents drop constraint if exists documents_owner_type_check;
alter table if exists public.documents add constraint documents_owner_type_check check (owner_type in ('student', 'employee', 'school'));

alter table if exists public.documents drop constraint if exists documents_confidentiality_check;
alter table if exists public.documents add constraint documents_confidentiality_check check (confidentiality in ('public', 'internal', 'confidential', 'restricted'));
alter table if exists public.documents drop constraint if exists documents_archive_status_check;
alter table if exists public.documents add constraint documents_archive_status_check check (archive_status in ('active', 'expired', 'retention_review', 'archived', 'destroyed'));

create table if not exists public.document_governance_actions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  action_type text not null check (action_type in ('review', 'extend', 'archive', 'destroy_request', 'destroy_approved', 'legal_hold', 'legal_hold_release')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  requested_by uuid references public.employees(id) on delete set null,
  decided_by uuid references public.employees(id) on delete set null,
  reason text not null,
  decision_note text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mail_records_unit_type_date_idx on public.mail_records(unit_id, type, mail_date desc);
create index if not exists mail_records_unit_status_due_idx on public.mail_records(unit_id, status, due_date);
create index if not exists mail_dispositions_employee_status_idx on public.mail_dispositions(to_employee_id, status, due_date);
create index if not exists documents_unit_archive_idx on public.documents(unit_id, archive_status, expiry_date);
create index if not exists documents_retention_idx on public.documents(retention_until) where archive_status <> 'destroyed';
create index if not exists governance_actions_status_idx on public.document_governance_actions(unit_id, status, requested_at desc);

create or replace function public.office_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_dokumen')
      and (scope.role_name in ('super_admin', 'ketua_yayasan') or scope.unit_id is null or (target_unit_id is not null and scope.unit_id = target_unit_id))
  );
$$;

create or replace function public.office_can_upload()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'kepala_tu', 'admin_tu', 'admin_sekolah', 'admin_unit', 'admin_dokumen')
  );
$$;

create or replace function public.employee_has_mail_assignment(target_mail_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mail_dispositions disposition
    where disposition.mail_id = target_mail_id
      and disposition.to_employee_id = public.current_employee_id()
  );
$$;

create or replace function public.protect_assigned_disposition_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_unit uuid;
begin
  select unit_id into target_unit from public.mail_records where id = old.mail_id;
  if not public.office_is_manager(target_unit) and old.to_employee_id = public.current_employee_id() then
    if row(new.mail_id, new.from_user_id, new.to_user_id, new.from_employee_id, new.to_employee_id,
           new.parent_disposition_id, new.instruction, new.due_date, new.disposition_type,
           new.priority, new.created_at)
       is distinct from
       row(old.mail_id, old.from_user_id, old.to_user_id, old.from_employee_id, old.to_employee_id,
           old.parent_disposition_id, old.instruction, old.due_date, old.disposition_type,
           old.priority, old.created_at) then
      raise exception 'Penerima hanya dapat memperbarui progres dan hasil disposisi';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_assigned_disposition_fields on public.mail_dispositions;
create trigger protect_assigned_disposition_fields before update on public.mail_dispositions
for each row execute function public.protect_assigned_disposition_fields();

create or replace function public.set_mail_agenda_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.agenda_number is null then
    new.agenda_number := case new.type when 'incoming' then 'AGD-M' when 'outgoing' then 'AGD-K' else 'AGD-I' end
      || '-' || to_char(coalesce(new.received_date, new.mail_date, current_date), 'YYYYMMDD')
      || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  if new.retention_until is null then new.retention_until := coalesce(new.mail_date, current_date) + interval '5 years'; end if;
  return new;
end;
$$;

drop trigger if exists set_mail_agenda_number on public.mail_records;
create trigger set_mail_agenda_number before insert on public.mail_records for each row execute function public.set_mail_agenda_number();
drop trigger if exists handle_mail_records_updated_at on public.mail_records;
create trigger handle_mail_records_updated_at before update on public.mail_records for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_document_governance_updated_at on public.document_governance_actions;
create trigger handle_document_governance_updated_at before update on public.document_governance_actions for each row execute procedure public.handle_updated_at();

create or replace function public.set_document_governance_defaults()
returns trigger language plpgsql set search_path = public as $$
declare v_type public.document_types;
begin
  select * into v_type from public.document_types where id = new.document_type_id;
  if new.unit_id is null then new.unit_id := v_type.unit_id; end if;
  if new.retention_until is null then new.retention_until := coalesce(new.document_date, new.effective_date, current_date) + make_interval(years => coalesce(v_type.retention_years, 5)); end if;
  if new.next_review_date is null and v_type.review_frequency_months is not null then new.next_review_date := current_date + make_interval(months => v_type.review_frequency_months); end if;
  if new.expiry_date is not null and new.expiry_date < current_date and new.archive_status = 'active' then new.archive_status := 'expired'; end if;
  return new;
end;
$$;

create or replace function public.enforce_document_destruction_approval()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.action_type = 'destroy_request' and new.status = 'approved' then
    if new.requested_by is null or new.decided_by is null then
      raise exception 'Pengusul dan penyetuju pemusnahan wajib tercatat';
    end if;
    if new.requested_by = new.decided_by then
      raise exception 'Penyetuju pemusnahan harus berbeda dari pengusul';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_document_destruction_approval on public.document_governance_actions;
create trigger enforce_document_destruction_approval before insert or update on public.document_governance_actions
for each row execute function public.enforce_document_destruction_approval();

drop trigger if exists set_document_governance_defaults on public.documents;
create trigger set_document_governance_defaults before insert or update on public.documents for each row execute function public.set_document_governance_defaults();

update public.documents document set unit_id = type.unit_id
from public.document_types type where document.document_type_id = type.id and document.unit_id is null;
update public.mail_records set retention_until = coalesce(mail_date, current_date) + interval '5 years' where retention_until is null;

alter table public.document_governance_actions enable row level security;
alter table public.mail_records enable row level security;
alter table public.mail_dispositions enable row level security;

drop policy if exists "Enable read access for all users on mail_records" on public.mail_records;
drop policy if exists "Enable insert access for authenticated users on mail_records" on public.mail_records;
drop policy if exists "Enable update access for authenticated users on mail_records" on public.mail_records;
drop policy if exists "Enable delete access for authenticated users on mail_records" on public.mail_records;
drop policy if exists "Enable read access for involved users on mail_dispositions" on public.mail_dispositions;
drop policy if exists "Enable insert access for authenticated users on mail_dispositions" on public.mail_dispositions;
drop policy if exists "Enable update access for authenticated users on mail_dispositions" on public.mail_dispositions;
drop policy if exists "Enable delete access for authenticated users on mail_dispositions" on public.mail_dispositions;

drop policy if exists "Office managers manage mail" on public.mail_records;
create policy "Office managers manage mail" on public.mail_records for all to authenticated
using (public.office_is_manager(unit_id)) with check (public.office_is_manager(unit_id));
drop policy if exists "Office managers manage dispositions" on public.mail_dispositions;
create policy "Office managers manage dispositions" on public.mail_dispositions for all to authenticated
using (public.office_is_manager((select mail.unit_id from public.mail_records mail where mail.id = mail_id)))
with check (public.office_is_manager((select mail.unit_id from public.mail_records mail where mail.id = mail_id)));
drop policy if exists "Employees read assigned dispositions" on public.mail_dispositions;
create policy "Employees read assigned dispositions" on public.mail_dispositions for select to authenticated
using (to_employee_id = public.current_employee_id() or from_employee_id = public.current_employee_id());
drop policy if exists "Employees update assigned dispositions" on public.mail_dispositions;
create policy "Employees update assigned dispositions" on public.mail_dispositions for update to authenticated
using (to_employee_id = public.current_employee_id()) with check (to_employee_id = public.current_employee_id());
drop policy if exists "Employees read disposition mail" on public.mail_records;
create policy "Employees read disposition mail" on public.mail_records for select to authenticated
using (public.employee_has_mail_assignment(id));

drop policy if exists "Office managers manage document governance" on public.document_governance_actions;
create policy "Office managers manage document governance" on public.document_governance_actions for all to authenticated
using (public.office_is_manager(unit_id)) with check (public.office_is_manager(unit_id));
drop policy if exists "Office managers manage documents" on public.documents;
create policy "Office managers manage documents" on public.documents for all to authenticated
using (public.office_is_manager(unit_id)) with check (public.office_is_manager(unit_id));
drop policy if exists "Office managers manage document types" on public.document_types;
create policy "Office managers manage document types" on public.document_types for all to authenticated
using (public.office_is_manager(unit_id)) with check (public.office_is_manager(unit_id));

-- Replace the former unit-wide document policy; personnel and student files are
-- not general shared-drive content.
drop policy if exists "Admin dokumen manages all documents" on public.documents;
drop policy if exists "Users read documents in their unit" on public.documents;
drop policy if exists "Admin dokumen manages doc types" on public.document_types;
drop policy if exists "Users read school documents in their unit" on public.documents;
create policy "Users read school documents in their unit" on public.documents for select to authenticated
using (owner_type = 'school' and confidentiality in ('public', 'internal') and public.can_access_unit(unit_id));
drop policy if exists "Employees read own documents" on public.documents;
create policy "Employees read own documents" on public.documents for select to authenticated
using (owner_type = 'employee' and owner_id = public.current_employee_id());

drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow authenticated reads" on storage.objects;
drop policy if exists "Office administration uploads documents" on storage.objects;
create policy "Office administration uploads documents" on storage.objects for insert to authenticated
with check (bucket_id = 'school-documents' and public.office_can_upload());
drop policy if exists "Authorized users read school documents" on storage.objects;
create policy "Authorized users read school documents" on storage.objects for select to authenticated
using (
  bucket_id = 'school-documents' and (
    exists (select 1 from public.documents document where document.file_path = name)
    or exists (select 1 from public.mail_records mail where mail.attachment_path = name)
  )
);

revoke all on function public.office_is_manager(uuid) from public;
grant execute on function public.office_is_manager(uuid) to authenticated;
revoke all on function public.office_can_upload() from public;
grant execute on function public.office_can_upload() to authenticated;
revoke all on function public.employee_has_mail_assignment(uuid) from public;
grant execute on function public.employee_has_mail_assignment(uuid) to authenticated;
grant select, insert, update, delete on public.mail_records, public.mail_dispositions to authenticated;
grant select, insert, update on public.document_governance_actions to authenticated;
