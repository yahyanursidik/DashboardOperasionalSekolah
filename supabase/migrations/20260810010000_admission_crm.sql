-- CRM pra-pendaftaran SPMB. Prospek tidak membutuhkan akun portal sampai
-- keluarga siap dikonversi menjadi pendaftar resmi.

-- The July admissions migration exists in some environments without a matching
-- history record. Keep this helper here so the CRM migration is self-contained.
create or replace function public.admission_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('super_admin') or public.has_role('ketua_yayasan') or public.has_role('kepsek')
    or public.has_role('wakasek') or public.has_role('kepala_tu') or public.has_role('admin_tu')
    or public.has_role('admin_sekolah') or public.has_role('admin_spmb')
    or (public.has_role('admin_unit') and (target_unit_id is null or public.can_access_unit(target_unit_id)));
$$;

create sequence if not exists public.admission_lead_number_seq;

create table if not exists public.admission_leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text unique,
  parent_name text not null,
  phone text not null,
  email text,
  child_name text,
  child_birth_date date,
  desired_unit_id uuid references public.units(id) on delete set null,
  desired_grade integer check (desired_grade is null or desired_grade between 0 and 12),
  academic_year_id uuid references public.academic_years(id) on delete set null,
  source text not null default 'other' check (source in (
    'walk_in', 'whatsapp', 'referral', 'partner', 'website', 'social_media', 'event', 'other'
  )),
  source_detail text,
  stage text not null default 'new' check (stage in (
    'new', 'contacted', 'qualified', 'visit_scheduled', 'visited',
    'nurturing', 'ready_to_apply', 'converted', 'lost'
  )),
  interest_level text not null default 'medium' check (interest_level in ('low', 'medium', 'high')),
  contact_preference text not null default 'whatsapp' check (contact_preference in ('whatsapp', 'phone', 'email', 'in_person')),
  assigned_to uuid references public.employees(id) on delete set null,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  notes text,
  consent_to_contact boolean not null default true,
  lost_reason text,
  converted_applicant_id uuid references public.admissions_applicants(id) on delete set null,
  converted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stage <> 'converted' or converted_applicant_id is not null)
);

create table if not exists public.admission_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.admission_leads(id) on delete cascade,
  activity_type text not null check (activity_type in (
    'note', 'whatsapp', 'phone', 'email', 'visit', 'survey', 'meeting', 'status_change', 'follow_up'
  )),
  subject text not null,
  notes text,
  outcome text,
  occurred_at timestamptz not null default now(),
  next_follow_up_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists admission_leads_pipeline_idx
  on public.admission_leads (stage, next_follow_up_at, created_at desc);
create index if not exists admission_leads_scope_idx
  on public.admission_leads (desired_unit_id, academic_year_id, stage);
create index if not exists admission_leads_phone_idx
  on public.admission_leads (phone);
create index if not exists admission_lead_activities_timeline_idx
  on public.admission_lead_activities (lead_id, occurred_at desc);

create or replace function public.set_admission_lead_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lead_number is null then
    new.lead_number := 'CRM-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.admission_lead_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_admission_lead_number on public.admission_leads;
create trigger set_admission_lead_number
before insert on public.admission_leads
for each row execute procedure public.set_admission_lead_number();

drop trigger if exists set_updated_at_admission_leads on public.admission_leads;
create trigger set_updated_at_admission_leads
before update on public.admission_leads
for each row execute procedure public.handle_updated_at();

create or replace function public.admission_lead_add_activity(
  p_lead_id uuid,
  p_activity_type text,
  p_subject text,
  p_notes text default null,
  p_outcome text default null,
  p_occurred_at timestamptz default now(),
  p_next_follow_up_at timestamptz default null,
  p_stage text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  lead_record public.admission_leads;
  activity_id uuid;
begin
  select * into lead_record from public.admission_leads where id = p_lead_id for update;
  if lead_record.id is null or not public.admission_is_manager(lead_record.desired_unit_id) then
    raise exception 'Prospek tidak ditemukan atau tidak dapat diakses.';
  end if;

  insert into public.admission_lead_activities (
    lead_id, activity_type, subject, notes, outcome, occurred_at, next_follow_up_at
  ) values (
    p_lead_id, p_activity_type, p_subject, nullif(trim(p_notes), ''),
    nullif(trim(p_outcome), ''), coalesce(p_occurred_at, now()), p_next_follow_up_at
  ) returning id into activity_id;

  update public.admission_leads
  set last_contacted_at = case when p_activity_type = 'note' then last_contacted_at else coalesce(p_occurred_at, now()) end,
      next_follow_up_at = p_next_follow_up_at,
      stage = coalesce(p_stage, stage),
      updated_by = auth.uid()
  where id = p_lead_id;

  return activity_id;
end;
$$;

create or replace function public.admission_lead_convert_to_applicant(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  lead_record public.admission_leads;
  applicant_id uuid;
  unit_name text;
  year_name text;
begin
  select * into lead_record from public.admission_leads where id = p_lead_id for update;
  if lead_record.id is null or not public.admission_is_manager(lead_record.desired_unit_id) then
    raise exception 'Prospek tidak ditemukan atau tidak dapat diakses.';
  end if;
  if lead_record.converted_applicant_id is not null then
    return lead_record.converted_applicant_id;
  end if;
  if nullif(trim(lead_record.child_name), '') is null then
    raise exception 'Nama calon murid wajib diisi sebelum konversi.';
  end if;
  if lead_record.desired_unit_id is null or lead_record.academic_year_id is null then
    raise exception 'Unit tujuan dan tahun ajaran wajib dipilih sebelum konversi.';
  end if;

  select name into unit_name from public.units where id = lead_record.desired_unit_id;
  select name into year_name from public.academic_years where id = lead_record.academic_year_id;

  insert into public.admissions_applicants (
    name, dob, academic_year, unit, parent_name, parent_phone, parent_email,
    unit_id, academic_year_id, desired_grade, workflow_status, status,
    assigned_to, registration_date, updated_by
  ) values (
    lead_record.child_name, lead_record.child_birth_date, year_name, unit_name,
    lead_record.parent_name, lead_record.phone, lead_record.email,
    lead_record.desired_unit_id, lead_record.academic_year_id, lead_record.desired_grade,
    'draft', 'Draf', lead_record.assigned_to, now(), auth.uid()
  ) returning id into applicant_id;

  update public.admission_leads
  set stage = 'converted', converted_applicant_id = applicant_id,
      converted_at = now(), next_follow_up_at = null, updated_by = auth.uid()
  where id = p_lead_id;

  insert into public.admission_lead_activities (
    lead_id, activity_type, subject, notes, outcome
  ) values (
    p_lead_id, 'status_change', 'Dikonversi menjadi pendaftar SPMB',
    'Prospek dipindahkan ke alur pendaftaran resmi.', 'converted'
  );

  return applicant_id;
end;
$$;

alter table public.admission_leads enable row level security;
alter table public.admission_lead_activities enable row level security;

drop policy if exists "Admissions managers manage leads" on public.admission_leads;
create policy "Admissions managers manage leads"
on public.admission_leads for all to authenticated
using (public.admission_is_manager(desired_unit_id))
with check (public.admission_is_manager(desired_unit_id));

drop policy if exists "Admissions managers manage lead activities" on public.admission_lead_activities;
create policy "Admissions managers manage lead activities"
on public.admission_lead_activities for all to authenticated
using (exists (
  select 1 from public.admission_leads lead
  where lead.id = admission_lead_activities.lead_id
    and public.admission_is_manager(lead.desired_unit_id)
))
with check (exists (
  select 1 from public.admission_leads lead
  where lead.id = admission_lead_activities.lead_id
    and public.admission_is_manager(lead.desired_unit_id)
));

grant select, insert, update, delete on public.admission_leads, public.admission_lead_activities to authenticated;
grant usage, select on sequence public.admission_lead_number_seq to authenticated;
grant execute on function public.admission_lead_add_activity(uuid,text,text,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.admission_lead_convert_to_applicant(uuid) to authenticated;

comment on table public.admission_leads is 'Prospek orang tua pra-pendaftaran yang belum memerlukan akun portal.';
comment on table public.admission_lead_activities is 'Riwayat komunikasi dan tindak lanjut prospek SPMB.';
