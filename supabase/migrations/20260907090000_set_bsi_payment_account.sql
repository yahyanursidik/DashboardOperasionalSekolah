insert into public.system_settings(key,value,description)
values
  ('finance_bank_name',to_jsonb('BSI'::text),'Bank tujuan pembayaran resmi'),
  ('finance_account_number',to_jsonb('1551-1441-07'::text),'Nomor rekening pembayaran resmi'),
  ('finance_account_name',to_jsonb('TSL Islamic School'::text),'Nama pemilik rekening pembayaran resmi')
on conflict(key) do update set value=excluded.value, description=excluded.description;

notify pgrst,'reload schema';
