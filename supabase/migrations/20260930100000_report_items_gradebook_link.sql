-- Rapor Digital <-> Gradebook: an item in a report template may represent a subject.
-- When linked, the teacher-input screen offers the subject's final Gradebook score
-- (academic_grades, weighted by the curriculum semester plan) so teachers enter grades once.
alter table public.report_template_items
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

create index if not exists report_template_items_subject_idx
  on public.report_template_items(subject_id)
  where subject_id is not null;

comment on column public.report_template_items.subject_id is
  'Mata pelajaran sumber nilai Gradebook (academic_grades) untuk item numerik rapor.';

notify pgrst, 'reload schema';
