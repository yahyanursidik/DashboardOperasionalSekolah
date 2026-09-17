-- Payment-proof submission must not rely on whichever browser-side RLS policy
-- happened to be installed last. This controlled RPC validates ownership,
-- lifecycle, billing snapshot, and storage location before writing the proof.

alter table public.admission_payments enable row level security;

drop policy if exists "Applicants manage own payments" on public.admission_payments;
create policy "Applicants manage own payments"
on public.admission_payments for insert to authenticated
with check (
  payment_type = 'registration'
  and status = 'submitted'
  and exists (
    select 1 from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.archived_at is null
      and applicant.workflow_status in ('draft', 'submitted', 'documents_review')
  )
);

drop policy if exists "Applicants update own payments" on public.admission_payments;
create policy "Applicants update own payments"
on public.admission_payments for update to authenticated
using (
  payment_type = 'registration'
  and status in ('pending', 'submitted', 'rejected')
  and exists (
    select 1 from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.archived_at is null
      and applicant.workflow_status in ('draft', 'submitted', 'documents_review')
  )
)
with check (
  payment_type = 'registration'
  and status = 'submitted'
  and exists (
    select 1 from public.admissions_applicants applicant
    where applicant.id = admission_payments.applicant_id
      and applicant.user_id = auth.uid()
      and applicant.archived_at is null
      and applicant.workflow_status in ('draft', 'submitted', 'documents_review')
  )
);

create or replace function public.admission_save_registration_payment(
  p_applicant_id uuid,
  p_amount numeric,
  p_paid_at date,
  p_proof_url text
)
returns public.admission_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant public.admissions_applicants;
  existing_payment public.admission_payments;
  saved_payment public.admission_payments;
  proof_url text := btrim(coalesce(p_proof_url, ''));
  expected_s3_fragment text := '/admissions/' || p_applicant_id::text || '/payments/';
  expected_legacy_prefix text := 'admissions/' || p_applicant_id::text || '/payments/';
begin
  if auth.uid() is null then
    raise exception 'Sesi pengguna tidak ditemukan. Silakan masuk kembali.';
  end if;
  select * into applicant
  from public.admissions_applicants
  where id = p_applicant_id
    and user_id = auth.uid()
    and archived_at is null
  for update;
  if applicant.id is null then
    raise exception 'Pendaftaran tidak ditemukan atau bukan milik akun Anda.';
  end if;
  if applicant.workflow_status not in ('draft', 'submitted', 'documents_review') then
    raise exception 'Bukti pembayaran tidak dapat diubah setelah proses seleksi dimulai.';
  end if;
  if applicant.registration_fee_amount is null or applicant.registration_fee_amount <= 0 then
    raise exception 'Tidak ada tagihan pendaftaran yang dapat dibayarkan.';
  end if;
  if p_amount is null or p_amount <> applicant.registration_fee_amount then
    raise exception 'Nominal bukti pembayaran harus sama dengan tagihan pendaftaran.';
  end if;
  if p_paid_at is null or p_paid_at > current_date then
    raise exception 'Tanggal transfer wajib diisi dan tidak boleh melebihi hari ini.';
  end if;
  if proof_url = '' or not (
    proof_url like 's3://%' || expected_s3_fragment || '%'
    or proof_url like expected_legacy_prefix || '%'
  ) then
    raise exception 'Referensi bukti pembayaran tidak valid.';
  end if;

  select * into existing_payment
  from public.admission_payments
  where applicant_id = applicant.id and payment_type = 'registration'
  for update;
  if existing_payment.id is not null and existing_payment.status in ('verified', 'waived') then
    raise exception 'Pembayaran telah diverifikasi dan tidak dapat diganti. Hubungi panitia bila ada koreksi.';
  end if;

  insert into public.admission_payments(
    applicant_id, payment_type, amount, paid_at, proof_url, status,
    verification_note, verified_at, verified_by
  ) values (
    applicant.id, 'registration', p_amount, p_paid_at, proof_url, 'submitted',
    null, null, null
  )
  on conflict (applicant_id, payment_type) do update
  set amount = excluded.amount,
      paid_at = excluded.paid_at,
      proof_url = excluded.proof_url,
      status = 'submitted',
      verification_note = null,
      verified_at = null,
      verified_by = null,
      updated_at = now()
  where public.admission_payments.status in ('pending', 'submitted', 'rejected')
  returning * into saved_payment;

  if saved_payment.id is null then
    raise exception 'Bukti pembayaran tidak dapat diperbarui karena statusnya sudah terkunci.';
  end if;
  return saved_payment;
end;
$$;

revoke all on function public.admission_save_registration_payment(uuid,numeric,date,text) from public;
grant execute on function public.admission_save_registration_payment(uuid,numeric,date,text) to authenticated;

notify pgrst, 'reload schema';
