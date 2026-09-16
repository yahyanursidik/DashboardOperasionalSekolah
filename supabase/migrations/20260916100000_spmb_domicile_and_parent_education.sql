-- Structured domicile and parent education for the SPMB parent portal.
alter table public.admissions_applicants
  add column if not exists domicile_regency text,
  add column if not exists domicile_province text,
  add column if not exists parent_education_level text,
  add column if not exists second_parent_education_level text;

create or replace function public.admission_require_completed_parent_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.workflow_status = 'submitted'
     and old.workflow_status is distinct from 'submitted'
     and current_setting('app.admission_finalizing', true) = 'on' then
    if nullif(btrim(coalesce(new.domicile_regency, '')), '') is null
       or nullif(btrim(coalesce(new.domicile_province, '')), '') is null
       or nullif(btrim(coalesce(new.parent_education_level, '')), '') is null then
      raise exception 'Kota/kabupaten, provinsi, dan pendidikan terakhir orang tua/wali harus dilengkapi.';
    end if;
    if nullif(btrim(coalesce(new.second_parent_name, '')), '') is not null
       and nullif(btrim(coalesce(new.second_parent_education_level, '')), '') is null then
      raise exception 'Pendidikan terakhir orang tua kedua harus dilengkapi.';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists admission_require_completed_parent_profile on public.admissions_applicants;
create trigger admission_require_completed_parent_profile
before update on public.admissions_applicants
for each row execute function public.admission_require_completed_parent_profile();

notify pgrst, 'reload schema';
