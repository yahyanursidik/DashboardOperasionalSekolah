-- Email transaksional (Mailketing) — outbox + log pengiriman per penerima.
--
-- Baris hanya ditulis oleh Edge Function `notify-email` (service role). Penerima selalu
-- ditentukan di server dari data sekolah, sehingga klien tidak dapat menjadikan fungsi
-- ini sebagai open relay. Keunikan (event, sumber, penerima) mencegah email ganda saat
-- tombol kirim ditekan berulang.
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('announcement', 'report_published', 'payment_verified')),
  source_id uuid not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  html text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (event_type, source_id, recipient_email)
);

create index if not exists email_messages_source_idx on public.email_messages(event_type, source_id);
create index if not exists email_messages_status_idx on public.email_messages(status, created_at desc);

alter table public.email_messages enable row level security;

create or replace function public.email_log_viewer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.auth_user_roles()
    where role_name in ('super_admin','ketua_yayasan','kepsek','wakasek','kepala_tu','admin_tu','admin_sekolah','admin_unit','admin_keuangan')
  );
$$;
grant execute on function public.email_log_viewer() to authenticated;

drop policy if exists "Staff read email log" on public.email_messages;
create policy "Staff read email log" on public.email_messages
  for select to authenticated using (public.email_log_viewer());
-- No insert/update/delete policy: writes come only from the Edge Function (service role).

notify pgrst, 'reload schema';
