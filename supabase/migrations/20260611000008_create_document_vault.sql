-- Create Document Types
CREATE TABLE public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('siswa', 'guru', 'sekolah', 'surat')),
  is_required boolean default false,
  unit_id uuid references public.units(id),
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create Documents (Polymorphic Vault)
CREATE TABLE public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('student', 'teacher', 'school')),
  owner_id uuid not null, -- Polymorphic ID
  document_type_id uuid references public.document_types(id) not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  status text not null check (status in ('belum_lengkap', 'menunggu_verifikasi', 'valid', 'perlu_revisi')) default 'menunggu_verifikasi',
  uploaded_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  note text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

CREATE TRIGGER handle_doc_types_updated_at BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_docs_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- SUPABASE STORAGE CONFIGURATION
-- ==========================================

-- Note: In a real Supabase project, you should run this via the Dashboard SQL Editor
-- to properly initialize the storage bucket and RLS policies.

insert into storage.buckets (id, name, public)
values ('school-documents', 'school-documents', false)
on conflict do nothing;

-- RLS: Only Authenticated users can insert
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'school-documents' );

-- RLS: Only Authenticated users can read
create policy "Allow authenticated reads"
on storage.objects for select
to authenticated
using ( bucket_id = 'school-documents' );
