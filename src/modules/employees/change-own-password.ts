import { supabaseClient } from "../../lib/supabase/client";

export function validatePortalPassword(password: string) {
  if (password.length < 10) return "Kata sandi minimal 10 karakter.";
  if (!/[a-z]/.test(password)) return "Tambahkan minimal satu huruf kecil.";
  if (!/[A-Z]/.test(password)) return "Tambahkan minimal satu huruf besar.";
  if (!/\d/.test(password)) return "Tambahkan minimal satu angka.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Tambahkan minimal satu simbol.";
  return null;
}

export async function changeOwnPortalPassword(newPassword: string) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  const response = await fetch("/api/manage-employee-access", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action: "change_own_password", newPassword }),
  });
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json") ? await response.json() as { error?: string; message?: string } : null;
  if (!response.ok || !result) throw new Error(result?.error || "Layanan keamanan akun belum dapat dihubungi.");
  await supabaseClient.auth.refreshSession();
  return result.message || "Kata sandi pribadi berhasil disimpan.";
}
