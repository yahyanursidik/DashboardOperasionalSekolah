-- Skrip untuk menambahkan data ke auth.identities yang hilang akibat seed manual
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    jsonb_build_object('sub', u.id, 'email', u.email),
    'email',
    u.email,
    u.last_sign_in_at,
    u.created_at,
    u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);
