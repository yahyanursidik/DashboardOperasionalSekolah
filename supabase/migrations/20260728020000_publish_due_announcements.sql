-- Scheduled announcements must become visible when their publication time is
-- reached. The RPC is also called by portal shells as a reliable fallback.

create or replace function public.publish_due_announcements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  published_count integer;
begin
  update public.announcements
  set status = 'terkirim',
      updated_at = now()
  where status = 'terjadwal'
    and publish_at is not null
    and publish_at <= now()
    and approved_at is not null;

  get diagnostics published_count = row_count;
  return published_count;
end;
$$;

create or replace function public.normalize_announcement_publication()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'terjadwal'
    and new.publish_at is not null
    and new.publish_at <= now()
    and new.approved_at is not null
  then
    new.status := 'terkirim';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_announcement_publication on public.announcements;
create trigger normalize_announcement_publication
  before insert or update of status, publish_at, approved_at
  on public.announcements
  for each row execute function public.normalize_announcement_publication();

revoke all on function public.publish_due_announcements() from public;
grant execute on function public.publish_due_announcements() to authenticated;

select public.publish_due_announcements();

-- Supabase projects with pg_cron enabled publish due announcements every
-- minute. Portal-triggered synchronization remains active when it is absent.
do $$
declare
  existing_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into existing_job
    from cron.job
    where jobname = 'publish-due-announcements'
    limit 1;

    if existing_job is not null then
      perform cron.unschedule(existing_job);
    end if;

    perform cron.schedule(
      'publish-due-announcements',
      '* * * * *',
      'select public.publish_due_announcements()'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$$;

notify pgrst, 'reload schema';
