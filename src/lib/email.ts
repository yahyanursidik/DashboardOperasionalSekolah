import { supabaseClient } from "./supabase";

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Mengirimkan notifikasi email via Supabase Edge Function 'send-email'
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
