-- One structured profile keeps unit-specific SPMB answers extensible while
-- preserving the same core identity and family data for every applicant.
alter table public.admissions_applicants
  add column if not exists admission_profile jsonb not null default '{}'::jsonb;

alter table public.admissions_applicants
  drop constraint if exists admissions_applicants_admission_profile_object;
alter table public.admissions_applicants
  add constraint admissions_applicants_admission_profile_object
  check (jsonb_typeof(admission_profile) = 'object');

create or replace function public.admission_normalize_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.admission_profile := coalesce(new.admission_profile, '{}'::jsonb);
  if jsonb_typeof(new.admission_profile) <> 'object' then
    raise exception 'Profil pendaftaran harus berupa data isian yang valid.';
  end if;
  return new;
end; $$;

drop trigger if exists admission_normalize_profile on public.admissions_applicants;
create trigger admission_normalize_profile
before insert or update of admission_profile on public.admissions_applicants
for each row execute function public.admission_normalize_profile();

create or replace function public.admission_require_unit_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  program_name text;
  profile jsonb := coalesce(new.admission_profile, '{}'::jsonb);
  is_hbl boolean;
  is_preschool boolean;
  is_elementary boolean;
begin
  if new.workflow_status <> 'submitted'
     or old.workflow_status = 'submitted'
     or current_setting('app.admission_finalizing', true) <> 'on' then
    return new;
  end if;

  select lower(concat_ws(' ', new.unit, unit_record.name, class_record.name))
    into program_name
  from public.units unit_record
  left join public.classes class_record on class_record.id = new.desired_class_id
  where unit_record.id = new.unit_id;
  program_name := coalesce(program_name, lower(coalesce(new.unit, '')));
  is_hbl := program_name ~ '(\mhbl\M|home[ -]?based learning|online|daring)';
  is_preschool := program_name ~ '(preschool|paud|playgroup|kelompok bermain|taman kanak|\mtk\M)';
  is_elementary := program_name ~ '(elementary|\msd\M|sekolah dasar)';

  if new.entry_type = 'transfer'
     and nullif(btrim(coalesce(profile ->> 'transfer_reason', '')), '') is null then
    raise exception 'Alasan perpindahan sekolah harus dilengkapi untuk siswa pindahan.';
  end if;
  if is_hbl and (
    nullif(btrim(coalesce(profile ->> 'home_learning_space', '')), '') is null
    or nullif(btrim(coalesce(profile ->> 'daily_learning_window', '')), '') is null
  ) then
    raise exception 'Kondisi ruang dan waktu belajar di rumah harus dilengkapi untuk HBL.';
  end if;
  if is_preschool and not is_hbl and (
    nullif(btrim(coalesce(profile ->> 'preschool_separation_readiness', '')), '') is null
    or nullif(btrim(coalesce(profile ->> 'preschool_meal_independence', '')), '') is null
  ) then
    raise exception 'Kesiapan adaptasi dan makan/minum perlu dilengkapi untuk Preschool Onsite.';
  end if;
  if is_elementary
     and nullif(btrim(coalesce(profile ->> 'elementary_learning_support', '')), '') is null then
    raise exception 'Informasi kebutuhan dukungan belajar perlu dilengkapi untuk Elementary.';
  end if;
  return new;
end; $$;

drop trigger if exists admission_require_unit_profile on public.admissions_applicants;
create trigger admission_require_unit_profile
before update on public.admissions_applicants
for each row execute function public.admission_require_unit_profile();

notify pgrst, 'reload schema';
