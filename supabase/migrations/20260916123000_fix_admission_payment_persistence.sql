-- A parent may replace a proof while it is still awaiting verification.
-- The previous policy evaluated the old payment status only as pending or
-- rejected, so an already-submitted proof could not be updated by upsert.
-- Keep the write narrowly scoped: parents can only write their own current
-- draft/documents-review application and the resulting status is submitted.

alter table public.admission_payments enable row level security;

drop policy if exists "Applicants manage own payments" on public.admission_payments;
create policy "Applicants manage own payments"
on public.admission_payments
for insert
to authenticated
with check (
  status = 'submitted'
  and exists (
    select 1
    from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.workflow_status in ('draft', 'documents_review')
  )
);

drop policy if exists "Applicants update own payments" on public.admission_payments;
create policy "Applicants update own payments"
on public.admission_payments
for update
to authenticated
using (
  status in ('pending', 'submitted', 'rejected')
  and exists (
    select 1
    from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.workflow_status in ('draft', 'documents_review')
  )
)
with check (
  status = 'submitted'
  and exists (
    select 1
    from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.workflow_status in ('draft', 'documents_review')
  )
);

notify pgrst, 'reload schema';
