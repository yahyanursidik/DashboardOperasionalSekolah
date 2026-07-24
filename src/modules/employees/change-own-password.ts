import { supabaseClient } from "../../lib/supabase/client";
import { requestEmployeeAccess } from "./employee-access-api";

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
  const result = await requestEmployeeAccess<{ error?: string; message?: string }>(
    { action: "change_own_password", newPassword },
    session.access_token,
  );
  await supabaseClient.auth.refreshSession();
  return result.message || "Kata sandi pribadi berhasil disimpan.";
}
