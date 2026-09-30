-- is_parent_of_student compared student_parent_links.parent_id (a parents.id) with auth.uid()
-- (an auth user id). Parents log in with their own auth user linked through parents.user_id, so
-- the check was always false and every policy built on it (published reports, scores, notes, PDF
-- exports, read receipts, grades, journals, conduct) silently denied parents. Until 2026-09-30 a
-- permissive "authenticated full access" policy hid the bug.

create or replace function public.is_parent_of_student(target_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.student_parent_links spl
    join public.parents p on p.id = spl.parent_id
    where spl.student_id = target_student_id
      and (p.user_id = auth.uid() or p.id = auth.uid()) -- p.id: legacy rows created with id = auth user id
      and p.is_active is distinct from false
      and coalesce(spl.can_access_parent_portal, true)
  );
$$;

-- parents.id values for the signed-in parent account.
create or replace function public.current_parent_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(p.id), '{}') from public.parents p
  where (p.user_id = auth.uid() or p.id = auth.uid()) and p.is_active is distinct from false;
$$;
grant execute on function public.current_parent_ids() to authenticated;

-- Read receipts reference parents.id, not the auth user id.
drop policy if exists "Parents can insert their own receipts" on public.parent_report_reads;
create policy "Parents can insert their own receipts" on public.parent_report_reads for insert to authenticated
  with check (
    parent_id = any(public.current_parent_ids())
    and exists (
      select 1 from public.student_reports sr
      where sr.id = parent_report_reads.report_id and sr.status = 'published' and public.is_parent_of_student(sr.student_id)
    )
  );
drop policy if exists "Parents can read their own receipts" on public.parent_report_reads;
create policy "Parents can read their own receipts" on public.parent_report_reads for select to authenticated
  using (parent_id = any(public.current_parent_ids()));

notify pgrst, 'reload schema';
