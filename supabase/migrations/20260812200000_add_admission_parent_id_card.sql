alter table public.admission_settings
  alter column required_documents
  set default array['family_card','birth_certificate','parent_id_card','photo']::text[];

update public.admission_settings
set required_documents = array_append(required_documents, 'parent_id_card'),
    updated_at = now()
where not ('parent_id_card' = any(required_documents));

create or replace function public.admission_transition(p_applicant_id uuid,p_to_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare a public.admissions_applicants; allowed boolean:=false; required_docs text[]; missing_docs integer;
begin
  select * into a from public.admissions_applicants where id=p_applicant_id for update;
  if a.id is null or not public.admission_is_manager(a.unit_id) then raise exception 'Pendaftar tidak ditemukan atau tidak dapat diakses.'; end if;
  if p_to_status='accepted' then perform public.admission_assert_available(a.id); end if;
  if p_to_status='verified' then
    select coalesce(s.required_documents,array['family_card','birth_certificate','parent_id_card','photo']::text[])
      into required_docs from public.admission_settings s
      where s.unit_id=a.unit_id and s.academic_year_id=a.academic_year_id limit 1;
    required_docs:=coalesce(required_docs,array['family_card','birth_certificate','parent_id_card','photo']::text[]);
    if a.entry_type='transfer' and not ('transfer_letter'=any(required_docs)) then
      required_docs:=array_append(required_docs,'transfer_letter');
    end if;
    select count(*) into missing_docs from unnest(required_docs) d(document_type)
      where not exists(
        select 1 from public.admission_documents x
        where x.applicant_id=a.id and x.document_type=d.document_type and x.status='valid'
      );
    if missing_docs>0 then raise exception 'Masih ada % dokumen wajib yang belum valid.',missing_docs; end if;
  end if;
  allowed:=case a.workflow_status
    when 'draft' then p_to_status in ('submitted','withdrawn')
    when 'submitted' then p_to_status in ('documents_review','verified','rejected','withdrawn')
    when 'documents_review' then p_to_status in ('verified','submitted','rejected')
    when 'verified' then p_to_status in ('assessment_scheduled','accepted','rejected')
    when 'assessment_scheduled' then p_to_status in ('assessed','verified','rejected')
    when 'assessed' then p_to_status in ('accepted','waitlisted','rejected')
    when 'waitlisted' then p_to_status in ('accepted','rejected','withdrawn')
    when 'accepted' then p_to_status in ('enrolled','withdrawn')
    else false end;
  if not allowed then raise exception 'Perubahan status dari % ke % tidak diizinkan.',a.workflow_status,p_to_status; end if;
  update public.admissions_applicants
  set workflow_status=p_to_status,
      verified_at=case when p_to_status='verified' then now() else verified_at end,
      decided_at=case when p_to_status in ('accepted','waitlisted','rejected') then now() else decided_at end,
      decision_notes=case when p_to_status in ('accepted','waitlisted','rejected') then p_note else decision_notes end,
      updated_by=auth.uid()
  where id=a.id;
  insert into public.admission_status_history(applicant_id,from_status,to_status,note,changed_by)
  values(a.id,a.workflow_status,p_to_status,p_note,auth.uid());
end; $$;

grant execute on function public.admission_transition(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
