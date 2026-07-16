create table if not exists public.digital_library_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.digital_library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  publisher text,
  publication_year text,
  category_id uuid references public.digital_library_categories(id) on delete set null,
  description text,
  cover_url text,
  file_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.digital_library_categories
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists code text,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.digital_library_books
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists resource_type text not null default 'ebook',
  add column if not exists audience text[] not null default array['all']::text[],
  add column if not exists grade_min smallint,
  add column if not exists grade_max smallint,
  add column if not exists language text not null default 'id',
  add column if not exists isbn text,
  add column if not exists page_count integer,
  add column if not exists estimated_minutes integer,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists is_featured boolean not null default false,
  add column if not exists publish_start_at timestamptz,
  add column if not exists publish_end_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.digital_library_books drop constraint if exists digital_library_books_resource_type_check;
alter table public.digital_library_books add constraint digital_library_books_resource_type_check
  check (resource_type in ('ebook', 'article', 'audio', 'video', 'external'));
alter table public.digital_library_books drop constraint if exists digital_library_books_audience_check;
alter table public.digital_library_books add constraint digital_library_books_audience_check
  check (audience <@ array['all', 'parents', 'students', 'teachers', 'staff']::text[] and cardinality(audience) > 0);
alter table public.digital_library_books drop constraint if exists digital_library_books_grade_check;
alter table public.digital_library_books add constraint digital_library_books_grade_check
  check (
    (grade_min is null or grade_min between 0 and 12)
    and (grade_max is null or grade_max between 0 and 12)
    and (grade_min is null or grade_max is null or grade_min <= grade_max)
  );
alter table public.digital_library_books drop constraint if exists digital_library_books_page_count_check;
alter table public.digital_library_books add constraint digital_library_books_page_count_check check (page_count is null or page_count > 0);
alter table public.digital_library_books drop constraint if exists digital_library_books_estimated_minutes_check;
alter table public.digital_library_books add constraint digital_library_books_estimated_minutes_check check (estimated_minutes is null or estimated_minutes between 1 and 10000);
alter table public.digital_library_books drop constraint if exists digital_library_books_publish_window_check;
alter table public.digital_library_books add constraint digital_library_books_publish_window_check
  check (publish_end_at is null or publish_start_at is null or publish_end_at > publish_start_at);

create index if not exists digital_library_books_catalog_idx
  on public.digital_library_books (is_active, unit_id, category_id, is_featured, created_at desc);
create index if not exists digital_library_books_audience_idx on public.digital_library_books using gin (audience);
create index if not exists digital_library_books_tags_idx on public.digital_library_books using gin (tags);
create index if not exists digital_library_categories_unit_idx on public.digital_library_categories (unit_id, is_active, sort_order, name);

create table if not exists public.digital_library_user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.digital_library_books(id) on delete cascade,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  completed_at timestamptz,
  is_favorite boolean not null default false,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index if not exists digital_library_user_books_book_idx
  on public.digital_library_user_books (book_id, completed_at, last_opened_at);

drop trigger if exists handle_updated_at_digital_library_categories on public.digital_library_categories;
drop trigger if exists set_updated_at_digital_library_categories on public.digital_library_categories;
create trigger set_updated_at_digital_library_categories before update on public.digital_library_categories
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at_digital_library_books on public.digital_library_books;
drop trigger if exists set_updated_at_digital_library_books on public.digital_library_books;
create trigger set_updated_at_digital_library_books before update on public.digital_library_books
  for each row execute procedure public.handle_updated_at();
drop trigger if exists set_updated_at_digital_library_user_books on public.digital_library_user_books;
create trigger set_updated_at_digital_library_user_books before update on public.digital_library_user_books
  for each row execute procedure public.handle_updated_at();

create or replace function public.digital_library_is_manager(target_unit_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_role('super_admin') or public.has_role('ketua_yayasan') or public.has_role('kepsek')
    or public.has_role('wakasek') or public.has_role('kepala_tu') or public.has_role('admin_tu')
    or public.has_role('admin_sekolah') or public.has_role('admin_dokumen')
    or (public.has_role('admin_unit') and target_unit_id is not null and public.can_access_unit(target_unit_id));
$$;

create or replace function public.digital_library_viewer_matches(book public.digital_library_books)
returns boolean language sql stable security definer set search_path = public as $$
  select book.is_active
    and (book.publish_start_at is null or book.publish_start_at <= now())
    and (book.publish_end_at is null or book.publish_end_at >= now())
    and (
      book.unit_id is null
      or exists (select 1 from public.employees e where e.user_id = auth.uid() and e.status = 'active' and e.unit_id = book.unit_id)
      or exists (
        select 1 from public.parents p
        join public.student_parent_links l on l.parent_id = p.id
        join public.students s on s.id = l.student_id
        where p.user_id = auth.uid() and s.status = 'active' and s.unit_id = book.unit_id
      )
    )
    and (
      'all' = any(book.audience)
      or ('parents' = any(book.audience) and exists (select 1 from public.parents p where p.user_id = auth.uid()))
      or ('students' = any(book.audience) and exists (
        select 1 from public.parents p join public.student_parent_links l on l.parent_id = p.id
        where p.user_id = auth.uid() and coalesce(l.can_access_parent_portal, true)
      ))
      or ('teachers' = any(book.audience) and exists (
        select 1 from public.employees e where e.user_id = auth.uid() and e.status = 'active'
          and e.position in ('guru', 'guru_quran', 'wali_kelas', 'kepala_sekolah', 'wakil_kepala_sekolah', 'kepala_unit', 'wakil_kepala_unit')
      ))
      or ('staff' = any(book.audience) and exists (
        select 1 from public.employees e where e.user_id = auth.uid() and e.status = 'active'
          and e.position not in ('guru', 'guru_quran', 'wali_kelas')
      ))
    );
$$;

alter table public.digital_library_categories enable row level security;
alter table public.digital_library_books enable row level security;
alter table public.digital_library_user_books enable row level security;

drop policy if exists "Enable read access for all users on digital_library_categories" on public.digital_library_categories;
drop policy if exists "Enable ALL for authenticated users on digital_library_categories" on public.digital_library_categories;
drop policy if exists "Library managers manage categories" on public.digital_library_categories;
create policy "Library managers manage categories" on public.digital_library_categories for all to authenticated
  using (public.digital_library_is_manager(unit_id)) with check (public.digital_library_is_manager(unit_id));
drop policy if exists "Scoped users view library categories" on public.digital_library_categories;
create policy "Scoped users view library categories" on public.digital_library_categories for select to authenticated
  using (is_active and (unit_id is null or public.can_access_unit(unit_id)
    or exists (select 1 from public.employees e where e.user_id = auth.uid() and e.unit_id = digital_library_categories.unit_id)
    or exists (select 1 from public.parents p join public.student_parent_links l on l.parent_id = p.id join public.students s on s.id = l.student_id where p.user_id = auth.uid() and s.unit_id = digital_library_categories.unit_id)));

drop policy if exists "Enable read access for all users on digital_library_books" on public.digital_library_books;
drop policy if exists "Enable ALL for authenticated users on digital_library_books" on public.digital_library_books;
drop policy if exists "Library managers manage books" on public.digital_library_books;
create policy "Library managers manage books" on public.digital_library_books for all to authenticated
  using (public.digital_library_is_manager(unit_id)) with check (public.digital_library_is_manager(unit_id));
drop policy if exists "Scoped users view published library books" on public.digital_library_books;
create policy "Scoped users view published library books" on public.digital_library_books for select to authenticated
  using (public.digital_library_viewer_matches(digital_library_books));

drop policy if exists "Users manage own library activity" on public.digital_library_user_books;
create policy "Users manage own library activity" on public.digital_library_user_books for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.digital_library_books b where b.id = book_id and public.digital_library_viewer_matches(b)));
drop policy if exists "Library managers view activity" on public.digital_library_user_books;
create policy "Library managers view activity" on public.digital_library_user_books for select to authenticated
  using (exists (select 1 from public.digital_library_books b where b.id = book_id and public.digital_library_is_manager(b.unit_id)));

grant select, insert, update, delete on public.digital_library_categories to authenticated;
grant select, insert, update, delete on public.digital_library_books to authenticated;
grant select, insert, update, delete on public.digital_library_user_books to authenticated;
grant execute on function public.digital_library_is_manager(uuid) to authenticated;
grant execute on function public.digital_library_viewer_matches(public.digital_library_books) to authenticated;

comment on table public.digital_library_books is 'Katalog pustaka digital multi-unit dan terarah berdasarkan audiens serta jenjang.';
comment on table public.digital_library_user_books is 'Aktivitas baca, favorit, dan penyelesaian koleksi per akun portal.';
