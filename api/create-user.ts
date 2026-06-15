import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, fullName, roleId, unitId } = req.body;

  // Validasi input
  if (!email || !password || !fullName || !roleId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Server configuration error: Missing Supabase credentials" });
  }

  // Inisialisasi Supabase client dengan SERVICE ROLE KEY
  // PENTING: Key ini mem-bypass semua aturan RLS di database
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Buat User di Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    const userId = userData.user.id;

    // 2. (Opsional) Supabase trigger biasanya membuat profile otomatis saat user dibuat,
    // tapi kita akan update nama lengkapnya untuk memastikan, atau biarkan trigger bekerja.
    // Kita update profile dengan nama lengkap.
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);

    // 3. Tambahkan peran (role) ke tabel user_roles
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
        unit_id: unitId || null,
      });

    if (roleError) {
      // Jika gagal set role, ini masalah, tapi user sudah dibuat.
      console.error("Failed to set role:", roleError);
    }

    return res.status(200).json({
      message: "User created successfully",
      user: {
        id: userId,
        email: email,
      },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
