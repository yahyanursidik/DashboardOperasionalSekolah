-- A signed program commitment is required for every SPMB pathway. We retain
-- the existing HBL document code so previously uploaded HBL commitments stay
-- valid, while the portal presents a program-specific template for all paths.

create or replace function public.admission_require_program_commitment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.workflow_status = 'submitted'
     and old.workflow_status is distinct from 'submitted'
     and current_setting('app.admission_finalizing', true) = 'on'
     and not exists (
       select 1
       from public.admission_documents document
       where document.applicant_id = new.id
         and document.document_type = 'home_learning_commitment'
         and document.status in ('submitted', 'valid')
     ) then
    raise exception 'Surat komitmen program yang telah ditandatangani wajib diunggah.';
  end if;
  return new;
end;
$$;

drop trigger if exists admission_require_program_commitment on public.admissions_applicants;
create trigger admission_require_program_commitment
before update on public.admissions_applicants
for each row execute function public.admission_require_program_commitment();

revoke all on function public.admission_require_program_commitment() from public;

notify pgrst, 'reload schema';
