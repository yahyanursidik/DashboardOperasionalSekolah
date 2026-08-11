-- Allows SPMB operators to prepare the next academic year's class structure
-- without leaving the integrated admission configuration screen.
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

grant execute on function public.admission_prepare_target_classes(uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
