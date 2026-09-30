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

export type NotificationEvent = "announcement" | "report_published" | "payment_verified";

export interface NotificationResult {
  success: boolean;
  recipients?: number;
  sentNow?: number;
  failedNow?: number;
  totals?: { queued: number; sending: number; sent: number; failed: number };
  error?: string;
}

/**
 * Emails parents/staff about school records (announcement, published report, verified payment).
 * Recipients are resolved on the server from the record ids; each recipient is mailed once per
 * record, so calling this again only sends what is still queued (or failed, with retryFailed).
 */
const NOTIFY_BATCH_SIZE = 200; // matches MAX_SOURCE_IDS in supabase/functions/notify-email

async function invokeNotify(event: NotificationEvent, ids: string[], retryFailed: boolean): Promise<NotificationResult> {
  const { data, error } = await supabaseClient.functions.invoke("notify-email", {
    body: { event, ids, retryFailed },
  });
  if (error) {
    // FunctionsHttpError carries the JSON body with our Indonesian message.
    const context = (error as { context?: Response }).context;
    const body = context && typeof context.json === "function" ? await context.json().catch(() => null) : null;
    return { success: false, error: body?.error || error.message };
  }
  return data as NotificationResult;
}

/**
 * Emails parents/staff about school records (announcement, published report, verified payment).
 * Recipients are resolved on the server from the record ids; each recipient is mailed once per
 * record, so calling this again only sends what is still queued (or failed, with retryFailed).
 */
export const sendNotificationEvent = async (
  event: NotificationEvent,
  ids: string[],
  options: { retryFailed?: boolean } = {},
): Promise<NotificationResult> => {
  const combined: NotificationResult = { success: true, recipients: 0, sentNow: 0, failedNow: 0, totals: { queued: 0, sending: 0, sent: 0, failed: 0 } };
  for (let index = 0; index < ids.length; index += NOTIFY_BATCH_SIZE) {
    const result = await invokeNotify(event, ids.slice(index, index + NOTIFY_BATCH_SIZE), Boolean(options.retryFailed));
    if (!result.success) return result;
    combined.recipients! += result.recipients || 0;
    combined.sentNow! += result.sentNow || 0;
    combined.failedNow! += result.failedNow || 0;
    for (const key of ["queued", "sending", "sent", "failed"] as const) combined.totals![key] += result.totals?.[key] || 0;
  }
  return combined;
};

export const describeNotificationResult = (result: NotificationResult) => {
  if (!result.success) return `Email belum terkirim: ${result.error}`;
  if (!result.recipients) return "Tidak ada penerima dengan alamat email terdaftar.";
  const totals = result.totals;
  const parts = [`${totals?.sent ?? result.sentNow ?? 0} terkirim`];
  if (totals?.failed) parts.push(`${totals.failed} gagal`);
  if (totals?.queued) parts.push(`${totals.queued} masih antre`);
  return `Email ke ${result.recipients} penerima: ${parts.join(", ")}.`;
};
