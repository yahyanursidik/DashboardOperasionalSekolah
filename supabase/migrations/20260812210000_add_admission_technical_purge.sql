create table if not exists public.admission_purge_audit (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  applicant_name text not null,
  unit_id uuid references public.units(id) on delete set null,
  previous_status text not null,
  released_quota boolean not null default false,
  reason text not null,
  purged_by uuid references auth.users(id) on delete set null,
  purged_at timestamptz not null default now()
);

alter table public.admission_purge_audit enable row level security;

drop policy if exists "Admissions managers view purge audit" on public.admission_purge_audit;
create policy "Admissions managers view purge audit"
on public.admission_purge_audit for select to authenticated
using (public.admission_is_manager(unit_id));

create or replace function public.admission_purge_applicant(
  p_applicant_id uuid,
  p_confirmation text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  applicant public.admissions_applicants;
  stored_paths jsonb;
  released_quota boolean;
begin
  select * into applicant
  from public.admissions_applicants
  where id=p_applicant_id
  for update;

  if applicant.id is null then
    raise exception 'Pendaftaran tidak ditemukan atau sudah dihapus.';
  end if;
  if not public.admission_is_manager(applicant.unit_id) then
    raise exception 'Anda tidak memiliki kewenangan menghapus pendaftaran ini.';
  end if;
  if applicant.workflow_status='enrolled' or applicant.student_id is not null then
    raise exception 'Pendaftar sudah menjadi siswa aktif. Kelola penghapusan melalui data siswa agar integritas akademik tetap terjaga.';
  end if;
  if upper(btrim(coalesce(p_confirmation,''))) is distinct from upper(btrim(applicant.registration_number)) then
    raise exception 'Konfirmasi nomor pendaftaran tidak sesuai.';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 8 then
    raise exception 'Alasan teknis wajib diisi sedikitnya 8 karakter.';
  end if;

  select coalesce(jsonb_agg(files.stored_path), '[]'::jsonb)
  into stored_paths
  from (
    select file_url as stored_path from public.admission_documents
    where applicant_id=applicant.id and nullif(btrim(file_url),'') is not null
    union
    select proof_url as stored_path from public.admission_payments
    where applicant_id=applicant.id and nullif(btrim(proof_url),'') is not null
  ) files;

  released_quota := applicant.workflow_status='accepted' and applicant.archived_at is null;

  insert into public.admission_purge_audit(
    registration_number,applicant_name,unit_id,previous_status,released_quota,reason,purged_by
  ) values (
    applicant.registration_number,applicant.name,applicant.unit_id,applicant.workflow_status,released_quota,btrim(p_reason),auth.uid()
  );

  delete from public.admissions_applicants where id=applicant.id;

  return jsonb_build_object(
    'registration_number', applicant.registration_number,
    'applicant_name', applicant.name,
    'released_quota', released_quota,
    'stored_paths', stored_paths
  );
end;
$$;

revoke all on function public.admission_purge_applicant(uuid,text,text) from public;
grant execute on function public.admission_purge_applicant(uuid,text,text) to authenticated;
grant select on public.admission_purge_audit to authenticated;

notify pgrst,'reload schema';
