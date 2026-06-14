-- SEED NEW ROLES
-- Eksekusi file ini di Supabase SQL Editor untuk menambahkan role baru.

INSERT INTO public.roles (name, description) VALUES 
('ketua_yayasan', 'Ketua Yayasan dengan akses supervisi global'),
('kepala_tu', 'Kepala Tata Usaha yang mengawasi administrasi operasional'),
('admin_tu', 'Staf / Admin Tata Usaha untuk operasional harian')
ON CONFLICT (name) DO NOTHING;
