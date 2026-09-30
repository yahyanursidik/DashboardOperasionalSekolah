import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  dedupeRecipients,
  escapeHtml,
  formatRupiah,
  normalizeEmail,
  renderEmail,
  runWithConcurrency,
  sendViaMailketing,
  textToHtml,
  type Recipient,
} from "../_shared/notify-core.ts";

// School notifications by email (Mailketing). The caller only names an event and the source
// records; recipients are always resolved here from school data, and each (event, source,
// recipient) is stored once in email_messages so repeated clicks never send duplicates.
//
// Secrets: MAILKETING_API_TOKEN (required), MAILKETING_FROM_EMAIL, MAILKETING_FROM_NAME,
// PUBLIC_APP_URL (portal links; falls back to the caller's Origin).

type EventType = "announcement" | "report_published" | "payment_verified";

const EVENT_ROLES: Record<EventType, string[]> = {
  announcement: ["super_admin", "ketua_yayasan", "kepsek", "wakasek", "kepala_tu", "admin_tu", "admin_sekolah", "admin_unit"],
  report_published: ["super_admin", "ketua_yayasan", "kepsek", "wakasek", "admin_sekolah", "admin_unit"],
  payment_verified: ["super_admin", "ketua_yayasan", "admin_keuangan", "kepsek", "kepala_tu"],
};
const TEACHER_POSITIONS = new Set(["kepala_sekolah", "wakasek_umum", "wakasek_kurikulum", "wakasek_kesiswaan", "kepala_unit", "guru", "guru_quran", "bk"]);
const MAX_SOURCE_IDS = 200;
const SEND_CONCURRENCY = 5;
const TIME_BUDGET_MS = 45_000;
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

interface OutgoingMessage {
  source_id: string;
  recipient: Recipient;
  subject: string;
  html: string;
}

interface Context {
  db: SupabaseClient;
  appUrl: string;
  schoolName: string;
  logoUrl: string;
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** PostgREST caps responses (1000 rows by default); page through everything. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function readSetting(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text;
}

/** studentId -> parent/guardian recipients (parents.email, falling back to the linked account email). */
async function parentsOfStudents(db: SupabaseClient, studentIds: string[]) {
  const result = new Map<string, Recipient[]>();
  if (studentIds.length === 0) return result;
  const links: Array<{ student_id: string; parent_id: string }> = [];
  for (const ids of chunk(studentIds, 200)) {
    const { data, error } = await db.from("student_parent_links").select("student_id, parent_id").in("student_id", ids);
    if (error) throw new Error(error.message);
    links.push(...(data || []));
  }
  const parentIds = [...new Set(links.map((link) => link.parent_id))];
  const parents = new Map<string, { full_name: string; email: string | null; user_id: string | null }>();
  for (const ids of chunk(parentIds, 200)) {
    const { data, error } = await db.from("parents").select("id, full_name, email, user_id").in("id", ids);
    if (error) throw new Error(error.message);
    for (const parent of data || []) parents.set(parent.id, parent);
  }
  const missingEmailUsers = [...parents.values()].filter((parent) => !normalizeEmail(parent.email) && parent.user_id).map((parent) => parent.user_id as string);
  const accountEmails = new Map<string, string>();
  for (const ids of chunk(missingEmailUsers, 200)) {
    const { data } = await db.from("profiles").select("id, email").in("id", ids);
    for (const profile of data || []) if (profile.email) accountEmails.set(profile.id, profile.email);
  }
  for (const link of links) {
    const parent = parents.get(link.parent_id);
    if (!parent) continue;
    const email = normalizeEmail(parent.email) || normalizeEmail(parent.user_id ? accountEmails.get(parent.user_id) : "");
    if (!email) continue;
    const list = result.get(link.student_id) || [];
    list.push({ email, name: parent.full_name });
    result.set(link.student_id, list);
  }
  return result;
}

async function activeStudentIds(db: SupabaseClient, scope: { classId?: string | null; unitId?: string | null }) {
  const rows = await fetchAll<{ id: string }>((from, to) => {
    let query = db.from("students").select("id").eq("status", "active");
    if (scope.classId) query = query.eq("class_id", scope.classId);
    if (scope.unitId) query = query.eq("unit_id", scope.unitId);
    return query.order("id").range(from, to);
  });
  return rows.map((row) => row.id);
}

async function activeEmployees(db: SupabaseClient, unitId?: string | null) {
  return fetchAll<{ full_name: string; email: string | null; position: string | null }>((from, to) => {
    let query = db.from("employees").select("full_name, email, position").eq("status", "active").not("email", "is", null);
    if (unitId) query = query.eq("unit_id", unitId);
    return query.order("id").range(from, to);
  });
}

async function buildAnnouncementMessages(ctx: Context, ids: string[]): Promise<OutgoingMessage[]> {
  const { data, error } = await ctx.db.from("announcements").select("id, title, content, target_type, unit_id, class_id, status").in("id", ids);
  if (error) throw new Error(error.message);
  const messages: OutgoingMessage[] = [];
  for (const announcement of data || []) {
    if (announcement.status !== "terkirim") continue; // drafts and scheduled items are not mailed yet
    const target = announcement.target_type as string;
    const parentRecipients: Recipient[] = [];
    const staffRecipients: Array<Recipient & { portal: string }> = [];

    if (["all", "parents", "unit", "class"].includes(target)) {
      const studentIds = await activeStudentIds(ctx.db, {
        classId: target === "class" ? announcement.class_id : null,
        unitId: target === "unit" ? announcement.unit_id : null,
      });
      const byStudent = await parentsOfStudents(ctx.db, studentIds);
      byStudent.forEach((list) => parentRecipients.push(...list));
    }
    if (["all", "staff", "unit"].includes(target)) {
      const employees = await activeEmployees(ctx.db, target === "unit" ? announcement.unit_id : null);
      for (const employee of employees) {
        staffRecipients.push({ email: employee.email || "", name: employee.full_name, portal: TEACHER_POSITIONS.has(employee.position || "") ? "/teacher/announcements" : "/staff/announcements" });
      }
    }

    const subject = `[Pengumuman] ${announcement.title}`;
    const bodyHtml = textToHtml(announcement.content);
    const build = (recipient: Recipient, portalPath: string): OutgoingMessage => ({
      source_id: announcement.id,
      recipient,
      subject,
      html: renderEmail({ schoolName: ctx.schoolName, logoUrl: ctx.logoUrl, heading: announcement.title, bodyHtml, ctaUrl: ctx.appUrl ? `${ctx.appUrl}${portalPath}` : null, ctaLabel: "Lihat di Portal" }),
    });
    for (const recipient of dedupeRecipients(parentRecipients)) messages.push(build(recipient, "/portal/announcements"));
    const parentEmails = new Set(messages.filter((m) => m.source_id === announcement.id).map((m) => m.recipient.email));
    for (const staff of staffRecipients) {
      const [recipient] = dedupeRecipients([staff]);
      if (recipient && !parentEmails.has(recipient.email)) {
        parentEmails.add(recipient.email);
        messages.push(build(recipient, staff.portal));
      }
    }
  }
  return messages;
}

async function buildReportMessages(ctx: Context, ids: string[]): Promise<OutgoingMessage[]> {
  const { data, error } = await ctx.db.from("student_reports").select("id, status, student_id, students(full_name), report_periods(name)").in("id", ids);
  if (error) throw new Error(error.message);
  const reports = (data || []).filter((report: any) => report.status === "published");
  const byStudent = await parentsOfStudents(ctx.db, [...new Set(reports.map((report: any) => report.student_id))]);
  const messages: OutgoingMessage[] = [];
  for (const report of reports as any[]) {
    const studentName = report.students?.full_name || "Ananda";
    const periodName = report.report_periods?.name || "Rapor";
    for (const recipient of dedupeRecipients(byStudent.get(report.student_id) || [])) {
      messages.push({
        source_id: report.id,
        recipient,
        subject: `${periodName} ${studentName} telah terbit`,
        html: renderEmail({
          schoolName: ctx.schoolName,
          logoUrl: ctx.logoUrl,
          heading: `${periodName} telah terbit`,
          bodyHtml: textToHtml(`Assalamu'alaikum ${recipient.name || "Bapak/Ibu"},\n\n${periodName} untuk ${studentName} sudah dapat dibaca di Portal Orang Tua. Mohon konfirmasi setelah membaca rapor.`),
          ctaUrl: ctx.appUrl ? `${ctx.appUrl}/portal/reports/${report.id}` : null,
          ctaLabel: "Baca Rapor",
        }),
      });
    }
  }
  return messages;
}

async function buildPaymentMessages(ctx: Context, ids: string[]): Promise<OutgoingMessage[]> {
  const { data, error } = await ctx.db.from("payment_transactions")
    .select("id, status, amount_paid, payment_date, reference_number, student_id, students(full_name), student_invoices(title, amount, discount, paid_amount, status)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const payments = (data || []).filter((payment: any) => payment.status === "verified");
  const byStudent = await parentsOfStudents(ctx.db, [...new Set(payments.map((payment: any) => payment.student_id))]);
  const messages: OutgoingMessage[] = [];
  for (const payment of payments as any[]) {
    const invoice = payment.student_invoices || {};
    const remaining = Math.max(0, Number(invoice.amount || 0) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0));
    const rows = [
      ["Siswa", payment.students?.full_name || "-"],
      ["Tagihan", invoice.title || "-"],
      ["Jumlah dibayar", formatRupiah(payment.amount_paid)],
      ["Tanggal bayar", payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"],
      ["No. referensi", payment.reference_number || "-"],
      ["Sisa tagihan", formatRupiah(remaining)],
    ];
    const table = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:14px">${rows.map(([label, value]) => `<tr><td style="padding:6px 0;color:#64748b;width:40%">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`).join("")}</table>`;
    for (const recipient of dedupeRecipients(byStudent.get(payment.student_id) || [])) {
      messages.push({
        source_id: payment.id,
        recipient,
        subject: `Pembayaran ${invoice.title || "tagihan"} telah diverifikasi`,
        html: renderEmail({
          schoolName: ctx.schoolName,
          logoUrl: ctx.logoUrl,
          heading: "Pembayaran telah diverifikasi",
          bodyHtml: `${textToHtml(`Terima kasih ${recipient.name || "Bapak/Ibu"}, pembayaran berikut telah kami terima dan verifikasi.`)}${table}`,
          ctaUrl: ctx.appUrl ? `${ctx.appUrl}/portal/finance` : null,
          ctaLabel: "Lihat Riwayat Pembayaran",
        }),
      });
    }
  }
  return messages;
}

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return response({ error: "Method tidak didukung." }, 405);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const apiToken = Deno.env.get("MAILKETING_API_TOKEN");
      if (!supabaseUrl || !serviceRoleKey) throw new Error("Konfigurasi Supabase fungsi belum tersedia.");
      if (!apiToken) return response({ error: "MAILKETING_API_TOKEN belum disetel pada Supabase Secrets." }, 500);

      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (!token) return response({ error: "Sesi pengguna diperlukan." }, 401);
      const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: actor, error: actorError } = await db.auth.getUser(token);
      if (actorError || !actor.user) return response({ error: "Sesi pengguna tidak valid." }, 401);

      const body = await req.json().catch(() => ({}));
      const event = body?.event as EventType;
      const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map((id: unknown) => String(id)).filter((id: string) => /^[0-9a-f-]{36}$/i.test(id)))] as string[];
      const retryFailed = Boolean(body?.retryFailed);
      if (!EVENT_ROLES[event]) return response({ error: "Jenis notifikasi tidak dikenal." }, 400);
      if (ids.length === 0 || ids.length > MAX_SOURCE_IDS) return response({ error: `Pilih 1–${MAX_SOURCE_IDS} data sumber.` }, 400);

      const { data: roleRows, error: roleError } = await db.from("user_roles").select("roles(name)").eq("user_id", actor.user.id);
      if (roleError) throw new Error(roleError.message);
      const roleNames = new Set((roleRows || []).map((row: any) => (Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name)));
      let allowed = EVENT_ROLES[event].some((role) => roleNames.has(role));
      if (!allowed && event === "payment_verified") {
        // The Bendahara portal admits treasurers by employee position (see bendahara-layout.tsx).
        const { data: employee } = await db.from("employees").select("position, status").eq("user_id", actor.user.id).maybeSingle();
        const position = String(employee?.position || "").toLowerCase();
        allowed = employee?.status === "active" && (position.includes("bendahara") || position.includes("keuangan"));
      }
      if (!allowed) return response({ error: "Anda tidak memiliki izin mengirim notifikasi ini." }, 403);

      const { data: settings } = await db.from("system_settings").select("key, value").in("key", ["app_name", "logo_url"]);
      const setting = (key: string) => readSetting((settings || []).find((row: any) => row.key === key)?.value);
      const schoolName = setting("app_name") || "TS Lab School";
      const origin = req.headers.get("origin") || "";
      const ctx: Context = {
        db,
        schoolName,
        logoUrl: setting("logo_url"),
        appUrl: (Deno.env.get("PUBLIC_APP_URL") || (/^https?:\/\//.test(origin) ? origin : "")).replace(/\/+$/, ""),
      };

      const builders: Record<EventType, (ctx: Context, ids: string[]) => Promise<OutgoingMessage[]>> = {
        announcement: buildAnnouncementMessages,
        report_published: buildReportMessages,
        payment_verified: buildPaymentMessages,
      };
      const outgoing = await builders[event](ctx, ids);
      for (const rows of chunk(outgoing, 500)) {
        const { error } = await db.from("email_messages").upsert(rows.map((message) => ({
          event_type: event,
          source_id: message.source_id,
          recipient_email: message.recipient.email,
          recipient_name: message.recipient.name,
          subject: message.subject,
          html: message.html,
          created_by: actor.user.id,
        })), { onConflict: "event_type,source_id,recipient_email", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }

      const sendable = retryFailed ? ["queued", "failed"] : ["queued"];
      const pending = await fetchAll<{ id: string; recipient_email: string; subject: string; html: string; attempts: number }>((from, to) =>
        db.from("email_messages").select("id, recipient_email, subject, html, attempts")
          .eq("event_type", event).in("source_id", ids).in("status", sendable).lt("attempts", MAX_ATTEMPTS)
          .order("created_at").range(from, to));

      const fromEmail = Deno.env.get("MAILKETING_FROM_EMAIL") || "no-reply@yts.web.id";
      const fromName = Deno.env.get("MAILKETING_FROM_NAME") || schoolName;
      let sent = 0;
      let failed = 0;
      await runWithConcurrency(pending, SEND_CONCURRENCY, async (row) => {
        // Claim the row first so a concurrent invocation cannot send the same email twice.
        const { data: claimed } = await db.from("email_messages")
          .update({ status: "sending", attempts: row.attempts + 1 })
          .eq("id", row.id).in("status", sendable).select("id");
        if (!claimed?.length) return;
        const result = await sendViaMailketing(fetch, { token: apiToken, fromName, fromEmail, recipient: row.recipient_email, subject: row.subject, content: row.html, messageId: row.id });
        if (result.ok) sent += 1; else failed += 1;
        await db.from("email_messages").update(result.ok
          ? { status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.providerMessageId, last_error: null }
          : { status: "failed", last_error: result.error }).eq("id", row.id);
      }, Date.now() + TIME_BUDGET_MS);

      const statusRows = await fetchAll<{ status: string }>((from, to) =>
        db.from("email_messages").select("status").eq("event_type", event).in("source_id", ids).order("id").range(from, to));
      const totals = { queued: 0, sending: 0, sent: 0, failed: 0 } as Record<string, number>;
      for (const row of statusRows) totals[row.status] = (totals[row.status] || 0) + 1;

      return response({ success: true, recipients: outgoing.length, sentNow: sent, failedNow: failed, totals });
    } catch (error) {
      console.error("notify-email gagal:", error instanceof Error ? error.message : error);
      return response({ error: error instanceof Error ? error.message : "Notifikasi email belum dapat diproses." }, 500);
    }
  },
};
