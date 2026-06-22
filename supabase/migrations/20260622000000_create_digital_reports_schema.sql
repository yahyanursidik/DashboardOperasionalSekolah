-- Phase 1: Rapor Digital Database Schema

-- 1. report_periods
create table public.report_periods (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade not null,
  academic_year_id uuid references public.academic_years(id) on delete cascade not null,
  semester_id uuid references public.semesters(id) on delete cascade not null,
  name text not null,
  report_type text not null check (report_type in ('progress_awal', 'progress_tengah', 'rapor_semester', 'rapor_program_khusus')),
  input_start_date date,
  input_due_date date,
  review_due_date date,
  publish_date date,
  description text,
  status text not null check (status in ('draft', 'active', 'closed', 'archived')) default 'draft',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);


-- 2. report_templates
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade not null,
  name text not null,
  report_type text not null check (report_type in ('progress_awal', 'progress_tengah', 'rapor_semester', 'rapor_program_khusus')),
  description text,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 3. report_template_sections
create table public.report_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.report_templates(id) on delete cascade not null,
  title text not null,
  description text,
  display_order int not null default 0,
  parent_visible boolean default true,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 4. report_template_items
create table public.report_template_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.report_template_sections(id) on delete cascade not null,
  name text not null,
  description text,
  assessment_type text not null check (assessment_type in ('rubric', 'numeric', 'predicate', 'narrative', 'checklist')),
  scale_type text,
  max_score numeric,
  display_order int not null default 0,
  parent_visible boolean default true,
  is_required boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 5. student_reports
create table public.student_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  class_id uuid references public.classes(id) not null,
  report_period_id uuid references public.report_periods(id) not null,
  template_id uuid references public.report_templates(id) not null,
  status text not null check (status in ('draft', 'teacher_input', 'homeroom_review', 'revision_needed', 'wakasek_review', 'principal_approval', 'approved', 'published', 'archived')) default 'draft',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- Prevent a student from having multiple active reports in the same period
create unique index idx_unique_active_student_report 
on public.student_reports(student_id, report_period_id) 
where status != 'archived';

-- 6. student_report_scores
create table public.student_report_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  item_id uuid references public.report_template_items(id) not null,
  score_numeric numeric,
  score_predicate text,
  score_narrative text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 7. student_report_notes
create table public.student_report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  note_type text not null,
  note text not null,
  parent_visible boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

-- 8. report_reviews
create table public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) not null,
  status_from text not null,
  status_to text not null,
  comments text,
  created_at timestamptz default now() not null
);

-- 9. report_publish_logs
create table public.report_publish_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  published_by uuid references public.profiles(id) not null,
  published_at timestamptz default now() not null,
  notes text
);

-- 10. parent_report_reads
create table public.parent_report_reads (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  parent_id uuid references public.parents(id) not null,
  read_at timestamptz default now() not null,
  device_info text
);

-- 11. report_pdf_exports
create table public.report_pdf_exports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.student_reports(id) on delete cascade not null,
  file_url text not null,
  generated_by uuid references public.profiles(id) not null,
  generated_at timestamptz default now() not null,
  version int default 1
);


-- Indexes for common filters
create index idx_report_periods_unit_id on public.report_periods(unit_id);
create index idx_report_periods_status on public.report_periods(status);

create index idx_report_templates_unit_id on public.report_templates(unit_id);

create index idx_student_reports_student_id on public.student_reports(student_id);
create index idx_student_reports_class_id on public.student_reports(class_id);
create index idx_student_reports_report_period_id on public.student_reports(report_period_id);
create index idx_student_reports_status on public.student_reports(status);
create index idx_student_reports_created_at on public.student_reports(created_at);

create index idx_student_report_scores_report_id on public.student_report_scores(report_id);
create index idx_student_report_notes_report_id on public.student_report_notes(report_id);


-- Apply updated_at trigger to relevant tables
create trigger handle_updated_at_report_periods before update on public.report_periods for each row execute procedure handle_updated_at();
create trigger handle_updated_at_report_templates before update on public.report_templates for each row execute procedure handle_updated_at();
create trigger handle_updated_at_report_template_sections before update on public.report_template_sections for each row execute procedure handle_updated_at();
create trigger handle_updated_at_report_template_items before update on public.report_template_items for each row execute procedure handle_updated_at();
create trigger handle_updated_at_student_reports before update on public.student_reports for each row execute procedure handle_updated_at();
create trigger handle_updated_at_student_report_scores before update on public.student_report_scores for each row execute procedure handle_updated_at();
create trigger handle_updated_at_student_report_notes before update on public.student_report_notes for each row execute procedure handle_updated_at();


-- Enable RLS
alter table public.report_periods enable row level security;
alter table public.report_templates enable row level security;
alter table public.report_template_sections enable row level security;
alter table public.report_template_items enable row level security;
alter table public.student_reports enable row level security;
alter table public.student_report_scores enable row level security;
alter table public.student_report_notes enable row level security;
alter table public.report_reviews enable row level security;
alter table public.report_publish_logs enable row level security;
alter table public.parent_report_reads enable row level security;
alter table public.report_pdf_exports enable row level security;

-- Create basic RLS policies (Allow all for authenticated users temporarily for development)
create policy "Allow authenticated full access to report_periods" on public.report_periods for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_templates" on public.report_templates for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_template_sections" on public.report_template_sections for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_template_items" on public.report_template_items for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to student_reports" on public.student_reports for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to student_report_scores" on public.student_report_scores for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to student_report_notes" on public.student_report_notes for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_reviews" on public.report_reviews for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_publish_logs" on public.report_publish_logs for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to parent_report_reads" on public.parent_report_reads for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to report_pdf_exports" on public.report_pdf_exports for all to authenticated using (true) with check (true);

-- RPC: duplicate_report_template
create or replace function public.duplicate_report_template(
  p_template_id uuid,
  p_new_name text,
  p_user_id uuid
) returns uuid
language plpgsql security definer
as $$
declare
  v_new_template_id uuid;
  v_section record;
  v_new_section_id uuid;
  v_item record;
begin
  -- 1. Copy the main template
  insert into public.report_templates (unit_id, name, report_type, description, is_active, created_by, updated_by)
  select unit_id, p_new_name, report_type, description, is_active, p_user_id, p_user_id
  from public.report_templates
  where id = p_template_id
  returning id into v_new_template_id;

  -- 2. Loop through sections
  for v_section in select * from public.report_template_sections where template_id = p_template_id order by display_order loop
    -- Copy section
    insert into public.report_template_sections (template_id, title, description, display_order, parent_visible, is_active, created_by, updated_by)
    values (v_new_template_id, v_section.title, v_section.description, v_section.display_order, v_section.parent_visible, v_section.is_active, p_user_id, p_user_id)
    returning id into v_new_section_id;

    -- 3. Copy items for this section
    insert into public.report_template_items (section_id, name, description, assessment_type, scale_type, max_score, display_order, parent_visible, is_required, created_by, updated_by)
    select v_new_section_id, name, description, assessment_type, scale_type, max_score, display_order, parent_visible, is_required, p_user_id, p_user_id
    from public.report_template_items
    where section_id = v_section.id
    order by display_order;
  end loop;

  return v_new_template_id;
end;
$$;
