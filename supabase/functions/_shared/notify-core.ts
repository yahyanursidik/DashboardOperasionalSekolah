// Runtime-agnostic helpers for the notify-email Edge Function (no Deno/npm imports, so they
// can be unit-tested with Node). Mailketing API: https://api.mailketing.co.id/docs/#send

export const MAILKETING_SEND_URL = "https://api.mailketing.co.id/api/v2/send";

export interface Recipient {
  email: string;
  name?: string | null;
}

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Normalises, drops invalid addresses, and keeps the first name seen for each address. */
export function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Map<string, Recipient>();
  for (const recipient of recipients) {
    const email = normalizeEmail(recipient.email);
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.set(email, { email, name: recipient.name?.trim() || null });
  }
  return [...seen.values()];
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain text written by staff → safe HTML paragraphs. */
export function textToHtml(text: string) {
  return String(text ?? "")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function formatRupiah(value: unknown) {
  const amount = Number(value) || 0;
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

export interface EmailLayout {
  schoolName: string;
  logoUrl?: string | null;
  heading: string;
  bodyHtml: string;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
}

/** Table-based layout so it renders consistently in Gmail/Outlook mobile and desktop. */
export function renderEmail(layout: EmailLayout) {
  const logo = layout.logoUrl && /^https:\/\//i.test(layout.logoUrl)
    ? `<img src="${escapeHtml(layout.logoUrl)}" alt="" height="40" style="display:block;height:40px;margin:0 auto 8px">`
    : "";
  const cta = layout.ctaUrl && /^https?:\/\//i.test(layout.ctaUrl)
    ? `<p style="margin:24px 0 8px;text-align:center"><a href="${escapeHtml(layout.ctaUrl)}" style="background:#047857;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px;display:inline-block">${escapeHtml(layout.ctaLabel || "Buka Portal")}</a></p>`
    : "";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0">
<tr><td style="padding:24px 24px 12px;text-align:center;border-bottom:1px solid #e2e8f0">${logo}<div style="font-size:15px;font-weight:700;color:#047857">${escapeHtml(layout.schoolName)}</div></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">
<h1 style="font-size:19px;line-height:1.35;margin:0 0 16px">${escapeHtml(layout.heading)}</h1>
${layout.bodyHtml}${cta}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;text-align:center">
Email ini dikirim otomatis oleh ${escapeHtml(layout.schoolName)}. Mohon tidak membalas email ini.
</td></tr></table></td></tr></table></body></html>`;
}

export interface MailketingPayload {
  token: string;
  fromName: string;
  fromEmail: string;
  recipient: string;
  subject: string;
  content: string;
  messageId?: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string | null;
  error?: string;
  /** Temporary failures (rate limit, 5xx, network) are worth retrying; config errors are not. */
  retryable: boolean;
}

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export async function sendViaMailketing(fetchImpl: FetchLike, payload: MailketingPayload): Promise<SendResult> {
  try {
    const result = await fetchImpl(MAILKETING_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Token": payload.token },
      body: JSON.stringify({
        from_name: payload.fromName,
        from_email: payload.fromEmail,
        recipient: payload.recipient,
        subject: payload.subject.slice(0, 998),
        content: payload.content,
        ...(payload.messageId ? { message_id: payload.messageId } : {}),
      }),
    });
    const body = await result.json().catch(() => ({}));
    if (result.ok && body?.success) {
      return { ok: true, providerMessageId: body?.data?.message_id ?? null, retryable: false };
    }
    const validation = body?.errors ? ` ${JSON.stringify(body.errors)}` : "";
    return {
      ok: false,
      error: `${result.status}: ${body?.message || "Mailketing menolak email."}${validation}`.slice(0, 500),
      retryable: result.status === 429 || result.status >= 500,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), retryable: true };
  }
}

/** Runs `worker` over items with bounded parallelism, stopping new work once `deadline` passes. */
export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>, deadline = Infinity) {
  let index = 0;
  let processed = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (index < items.length && Date.now() < deadline) {
      const item = items[index++];
      await worker(item);
      processed += 1;
    }
  });
  await Promise.all(lanes);
  return processed;
}
