-- Notifikasi dalam aplikasi (lonceng) untuk panel admin, portal orang tua, guru, dan staf.
--
-- Baris dibuat oleh trigger database dari kejadian sekolah, bukan oleh klien. Setiap pengguna
-- hanya dapat membaca, menandai-baca, dan menghapus notifikasinya sendiri. Trigger menangkap
-- semua error agar pembuatan notifikasi tidak pernah menggagalkan transaksi utama.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('announcement', 'report', 'payment', 'leave', 'task')),
  event_key text not null,
  source_id uuid,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, category, source_id, event_key)
);

create index if not exists notifications_user_recent_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users mark own notifications" on public.notifications;
create policy "Users mark own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Clients may only flip read_at; everything else is written by the triggers below.
revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_users(
  target_users uuid[], p_category text, p_event_key text, p_source_id uuid,
  p_title text, p_body text, p_link text
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, category, event_key, source_id, title, body, link)
  select distinct u, p_category, p_event_key, p_source_id, left(p_title, 200), left(p_body, 500), p_link
  from unnest(target_users) as u
  where u is not null
  on conflict (user_id, category, source_id, event_key) do nothing;
$$;
revoke all on function public.notify_users(uuid[], text, text, uuid, text, text, text) from public, anon, authenticated;

-- Portal path for an employee account: teachers use /teacher, other staff use /staff.
create or replace function public.employee_portal_prefix(p_user_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.employees e where e.user_id = p_user_id
      and e.position in ('kepala_sekolah','wakasek_umum','wakasek_kurikulum','wakasek_kesiswaan','kepala_unit','guru','guru_quran','bk')) then '/teacher'
    when exists (select 1 from public.employees e where e.user_id = p_user_id) then '/staff'
    else null
  end;
$$;
revoke all on function public.employee_portal_prefix(uuid) from public, anon, authenticated;

-- Parent accounts linked to a student.
create or replace function public.parent_user_ids(p_student_ids uuid[])
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.user_id), '{}')
  from public.student_parent_links l
  join public.parents p on p.id = l.parent_id
  where l.student_id = any(p_student_ids) and p.user_id is not null;
$$;
revoke all on function public.parent_user_ids(uuid[]) from public, anon, authenticated;

-- 1. Announcements become visible ("terkirim")
create or replace function public.notify_announcement_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  student_ids uuid[];
  employee record;
begin
  if new.status <> 'terkirim' or (tg_op = 'UPDATE' and old.status = 'terkirim') then return new; end if;

  if new.target_type in ('all', 'parents', 'unit', 'class') then
    select coalesce(array_agg(s.id), '{}') into student_ids from public.students s
    where s.status = 'active'
      and (new.target_type <> 'class' or s.class_id = new.class_id)
      and (new.target_type <> 'unit' or s.unit_id = new.unit_id);
    perform public.notify_users(public.parent_user_ids(student_ids), 'announcement', 'published', new.id,
      new.title, left(new.content, 180), '/portal/announcements');
  end if;

  if new.target_type in ('all', 'staff', 'unit') then
    for employee in
      select e.user_id from public.employees e
      where e.user_id is not null and e.status = 'active'
        and (new.target_type <> 'unit' or e.unit_id = new.unit_id)
    loop
      perform public.notify_users(array[employee.user_id], 'announcement', 'published', new.id,
        new.title, left(new.content, 180), coalesce(public.employee_portal_prefix(employee.user_id), '') || '/announcements');
    end loop;
  end if;
  return new;
exception when others then
  raise warning 'notify_announcement_published: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_announcement_published on public.announcements;
create trigger notify_announcement_published after insert or update of status on public.announcements
  for each row execute function public.notify_announcement_published();

-- 2. Report published to parents
create or replace function public.notify_report_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  period_name text;
  student_name text;
begin
  if new.status <> 'published' or old.status = 'published' then return new; end if;
  select name into period_name from public.report_periods where id = new.report_period_id;
  select full_name into student_name from public.students where id = new.student_id;
  perform public.notify_users(public.parent_user_ids(array[new.student_id]), 'report', 'published', new.id,
    coalesce(period_name, 'Rapor') || ' telah terbit',
    'Rapor ' || coalesce(student_name, 'ananda') || ' sudah dapat dibaca. Mohon konfirmasi setelah membaca.',
    '/portal/reports/' || new.id);
  return new;
exception when others then
  raise warning 'notify_report_published: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_report_published on public.student_reports;
create trigger notify_report_published after update of status on public.student_reports
  for each row execute function public.notify_report_published();

-- 3. Payment verified / rejected
create or replace function public.notify_payment_reviewed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invoice_title text;
begin
  if new.status not in ('verified', 'rejected') or old.status = new.status then return new; end if;
  select title into invoice_title from public.student_invoices where id = new.invoice_id;
  perform public.notify_users(public.parent_user_ids(array[new.student_id]), 'payment', new.status, new.id,
    case when new.status = 'verified' then 'Pembayaran diverifikasi' else 'Bukti pembayaran ditolak' end,
    coalesce(invoice_title, 'Tagihan') || ' — Rp' || replace(to_char(coalesce(new.amount_paid, 0), 'FM999,999,999,999'), ',', '.') ||
      case when new.status = 'rejected' then '. Silakan periksa catatan dan unggah ulang bukti.' else '' end,
    '/portal/finance');
  return new;
exception when others then
  raise warning 'notify_payment_reviewed: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_payment_reviewed on public.payment_transactions;
create trigger notify_payment_reviewed after update of status on public.payment_transactions
  for each row execute function public.notify_payment_reviewed();

-- 4. Leave request decided
create or replace function public.notify_leave_decided()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  employee_user uuid;
begin
  if new.status not in ('approved', 'rejected') or old.status = new.status then return new; end if;
  select user_id into employee_user from public.employees where id = new.employee_id;
  if employee_user is null then return new; end if;
  perform public.notify_users(array[employee_user], 'leave', new.status, new.id,
    case when new.status = 'approved' then 'Pengajuan izin disetujui' else 'Pengajuan izin ditolak' end,
    'Status pengajuan ' || replace(new.leave_type, '_', ' ') || ' Anda telah diperbarui.',
    coalesce(public.employee_portal_prefix(employee_user), '') || case when public.employee_portal_prefix(employee_user) is null then '/leaves/show/' || new.id else '/leaves' end);
  return new;
exception when others then
  raise warning 'notify_leave_decided: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_leave_decided on public.leave_requests;
create trigger notify_leave_decided after update of status on public.leave_requests
  for each row execute function public.notify_leave_decided();

-- 5. Task assigned
create or replace function public.notify_task_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prefix text;
begin
  if new.assigned_to is null or (tg_op = 'UPDATE' and old.assigned_to is not distinct from new.assigned_to) then return new; end if;
  if new.assigned_to = new.created_by then return new; end if;
  prefix := public.employee_portal_prefix(new.assigned_to);
  perform public.notify_users(array[new.assigned_to], 'task', 'assigned:' || new.assigned_to, new.id,
    'Tugas baru: ' || new.title,
    case when new.due_date is not null then 'Tenggat ' || to_char(new.due_date, 'DD-MM-YYYY') else null end,
    case when prefix is null then '/tasks/show/' || new.id else prefix || '/tasks' end);
  return new;
exception when others then
  raise warning 'notify_task_assigned: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists notify_task_assigned on public.admin_tasks;
create trigger notify_task_assigned after insert or update of assigned_to on public.admin_tasks
  for each row execute function public.notify_task_assigned();

-- Realtime delivery to the bell (RLS still limits each subscriber to their own rows).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;

notify pgrst, 'reload schema';
