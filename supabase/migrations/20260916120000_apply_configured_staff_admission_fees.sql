-- A configured staff-yayasan rate is a published fee decision. Apply it
-- directly to the applicant instead of hiding the invoice behind a separate
-- approval queue. The NIK remains recorded for audit, while a missing staff
-- rate still keeps the applicant in the pending state.
create or replace function public.admission_set_fee_snapshot()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_rule public.admission_fee_rules;
  v_reviewing boolean := coalesce(current_setting('app.admission_fee_review', true), '') = 'on';
begin
  select * into v_rule
  from public.admission_fee_rules
  where batch_id = new.batch_id and applicant_category = new.registration_fee_category;

  if tg_op = 'INSERT' then
    if new.registration_fee_category = 'foundation_staff' and coalesce(v_rule.is_configured, false) then
      new.staff_fee_status := 'approved';
      new.staff_fee_review_note := 'Tarif staf yayasan diterapkan sesuai pengaturan gelombang.';
      new.staff_fee_reviewed_at := now();
      new.staff_fee_reviewed_by := auth.uid();
    elsif new.registration_fee_category = 'foundation_staff' then
      new.staff_fee_status := 'pending';
    else
      new.staff_fee_status := 'not_applicable';
      new.staff_employee_nik := null;
      new.staff_employee_id := null;
    end if;
  elsif not v_reviewing then
    if new.batch_id is distinct from old.batch_id
      or new.registration_fee_category is distinct from old.registration_fee_category
      or (new.registration_fee_category = 'foundation_staff' and new.staff_employee_nik is distinct from old.staff_employee_nik) then
      if new.registration_fee_category = 'foundation_staff' and coalesce(v_rule.is_configured, false) then
        new.staff_fee_status := 'approved';
        new.staff_employee_id := null;
        new.staff_fee_review_note := 'Tarif staf yayasan diterapkan sesuai pengaturan gelombang.';
        new.staff_fee_reviewed_at := now();
        new.staff_fee_reviewed_by := auth.uid();
      elsif new.registration_fee_category = 'foundation_staff' then
        new.staff_fee_status := 'pending';
        new.staff_employee_id := null;
        new.staff_fee_review_note := null;
        new.staff_fee_reviewed_at := null;
        new.staff_fee_reviewed_by := null;
      else
        new.staff_fee_status := 'not_applicable';
        new.staff_employee_nik := null;
        new.staff_employee_id := null;
        new.staff_fee_review_note := null;
        new.staff_fee_reviewed_at := null;
        new.staff_fee_reviewed_by := null;
      end if;
    else
      new.staff_fee_status := old.staff_fee_status;
      new.staff_employee_id := old.staff_employee_id;
      new.staff_fee_review_note := old.staff_fee_review_note;
      new.staff_fee_reviewed_at := old.staff_fee_reviewed_at;
      new.staff_fee_reviewed_by := old.staff_fee_reviewed_by;
      new.registration_fee_rule_id := old.registration_fee_rule_id;
      new.registration_fee_amount := old.registration_fee_amount;
      new.registration_fee_snapshot_at := old.registration_fee_snapshot_at;
      return new;
    end if;
  end if;

  if new.registration_fee_category = 'foundation_staff' and new.staff_fee_status = 'pending' then
    new.registration_fee_rule_id := null;
    new.registration_fee_amount := null;
    new.registration_fee_snapshot_at := now();
    return new;
  end if;

  select * into v_rule
  from public.admission_fee_rules
  where batch_id = new.batch_id
    and applicant_category = case when new.registration_fee_category = 'foundation_staff' and new.staff_fee_status = 'approved' then 'foundation_staff' else 'regular' end;
  if v_rule.id is null then
    new.registration_fee_rule_id := null;
    select registration_fee into new.registration_fee_amount from public.admission_batches where id = new.batch_id;
  else
    new.registration_fee_rule_id := v_rule.id;
    new.registration_fee_amount := case when v_rule.is_configured then v_rule.amount else null end;
  end if;
  new.registration_fee_snapshot_at := now();
  return new;
end; $$;

-- Reconcile applicants created before the direct configured-rate behavior.
select set_config('app.admission_fee_review', 'on', true);
update public.admissions_applicants applicant
set staff_fee_status = 'approved',
    staff_fee_review_note = 'Tarif staf yayasan diterapkan sesuai pengaturan gelombang.',
    staff_fee_reviewed_at = coalesce(staff_fee_reviewed_at, now()),
    staff_fee_reviewed_by = coalesce(staff_fee_reviewed_by, auth.uid()),
    updated_at = now()
from public.admission_fee_rules rule
where applicant.registration_fee_category = 'foundation_staff'
  and applicant.staff_fee_status = 'pending'
  and rule.batch_id = applicant.batch_id
  and rule.applicant_category = 'foundation_staff'
  and rule.is_configured = true;

insert into public.admission_payments(applicant_id, payment_type, amount, status, verification_note, verified_at, verified_by)
select applicant.id, 'registration', 0, 'waived', 'Tarif staf yayasan dibebaskan sesuai pengaturan gelombang.', now(), auth.uid()
from public.admissions_applicants applicant
where applicant.registration_fee_category = 'foundation_staff'
  and applicant.staff_fee_status = 'approved'
  and applicant.registration_fee_amount = 0
on conflict(applicant_id, payment_type) do update
set amount = 0, status = 'waived', proof_url = null, paid_at = null,
    verification_note = 'Tarif staf yayasan dibebaskan sesuai pengaturan gelombang.',
    verified_at = now(), verified_by = auth.uid();

notify pgrst, 'reload schema';
