-- The parent-facing final-submit RPC legitimately updates the workflow and
-- audit columns. The edit guard must allow only that transaction-scoped path;
-- regular browser updates remain unable to control protected fields.

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

  -- admission_submit_application sets this transaction-local flag immediately
  -- before changing the protected workflow/audit fields. It can only succeed
  -- for the authenticated owner because the RPC locks and verifies the row.
  if current_setting('app.admission_finalizing', true) = 'on'
     and old.user_id = auth.uid()
     and old.workflow_status in ('draft', 'documents_review')
     and new.workflow_status = 'submitted'
     and new.submitted_at is not null
     and new.updated_by = auth.uid() then
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
end;
$$;

revoke all on function public.admission_guard_parent_data_edit() from public;

notify pgrst, 'reload schema';
