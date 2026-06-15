-- Skrip untuk memperbaiki meta data pengguna yang hilang akibat seed lama
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL OR raw_app_meta_data = '{}'::jsonb;
