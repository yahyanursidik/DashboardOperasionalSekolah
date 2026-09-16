import { supabaseClient } from "./supabase/client";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Mengirimkan notifikasi transaksional ke alamat email akun yang sedang masuk.
 * Token Mailketing hanya dipakai oleh Supabase Edge Function dan tidak pernah
 * tersedia di browser.
 * 
 * @param params Data email (Penerima, Judul, Isi HTML, Isi Teks Murni)
 * @returns Object response dari Edge Function
 */
export const sendNotificationEmail = async (params: EmailParams) => {
  try {
    const { data, error } = await supabaseClient.functions.invoke("send-email", {
      body: params,
    });

    if (error) {
      console.error("Gagal memanggil fungsi send-email:", error);
      throw error;
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Kesalahan saat mengirim notifikasi email:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
};
