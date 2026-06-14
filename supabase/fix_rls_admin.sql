-- =========================================================================
-- FIX ADMIN ACCESS & ROLES
-- Jalankan script ini di Supabase SQL Editor agar akun Anda bisa melihat semua data
-- =========================================================================

-- 1. PASTIKAN ROLE 'super_admin' ADA DI DATABASE
INSERT INTO public.roles (name, description) VALUES 
('super_admin', 'Administrator Sistem Pusat dengan akses tak terbatas'),
('admin_sekolah', 'Administrator Sekolah/Unit'),
('wakasek', 'Wakil Kepala Sekolah')
ON CONFLICT (name) DO NOTHING;

-- 2. JADIKAN SEMUA AKUN SAAT INI SEBAGAI SUPER ADMIN (UNTUK DEMO)
-- Agar Anda tidak terblokir oleh keamanan RLS (Row Level Security),
-- script ini akan memberikan hak akses 'super_admin' ke semua profil yang ada.
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
    p.id, 
    (SELECT id FROM public.roles WHERE name = 'super_admin')
FROM public.profiles p
ON CONFLICT DO NOTHING;

-- Opsional: Jika Anda tahu email login Anda, Anda juga bisa menentukannya:
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT id, (SELECT id FROM public.roles WHERE name = 'super_admin') 
-- FROM auth.users WHERE email = 'emailanda@contoh.com'
-- ON CONFLICT DO NOTHING;
