import "npm:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return response({ error: "Method tidak didukung." }, 405);

    try {
      const authorization = req.headers.get("authorization") || "";
      if (!authorization.startsWith("Bearer ")) return response({ error: "Sesi pengguna diperlukan." }, 401);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !supabaseAnonKey) throw new Error("Konfigurasi autentikasi fungsi belum tersedia.");

      const userResult = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { authorization, apikey: supabaseAnonKey },
      });
      const user = userResult.ok ? await userResult.json() : null;
      const authenticatedEmail = normalizeEmail(user?.email);
      if (!authenticatedEmail) return response({ error: "Sesi pengguna tidak valid." }, 401);

      const { to, subject, html, text } = await req.json();
      const recipient = normalizeEmail(to);
      const emailSubject = String(subject || "").trim();
      const content = String(html || text || "").trim();
      if (!recipient || !emailSubject || !content) return response({ error: "Penerima, subjek, dan isi email wajib diisi." }, 400);

      // This endpoint is intentionally a receipt/notification endpoint, not an
      // open relay. A signed-in user can only request an email to their own
      // verified login address. Staff-to-parent mail should use a separately
      // audited server workflow instead of exposing arbitrary recipients here.
      if (recipient !== authenticatedEmail) return response({ error: "Email hanya dapat dikirim ke alamat akun yang sedang masuk." }, 403);

      const apiToken = Deno.env.get("MAILKETING_API_TOKEN");
      if (!apiToken) throw new Error("MAILKETING_API_TOKEN belum disetel pada Supabase Secrets.");

      const mailketingResult = await fetch("https://api.mailketing.co.id/api/v2/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": apiToken },
        body: JSON.stringify({
          from_name: "TS Lab School",
          from_email: "no-reply@yts.web.id",
          recipient,
          subject: emailSubject,
          content,
        }),
      });
      const mailketing = await mailketingResult.json().catch(() => ({}));
      if (!mailketingResult.ok || !mailketing?.success) {
        console.error("Mailketing menolak email", { status: mailketingResult.status, message: mailketing?.message });
        return response({ error: mailketing?.message || "Email belum dapat dikirim." }, mailketingResult.status >= 400 ? mailketingResult.status : 502);
      }

      return response({ success: true, messageId: mailketing?.data?.message_id || null, message: mailketing?.message || "Email masuk antrean pengiriman." });
    } catch (error) {
      console.error("Gagal mengirim email transaksional:", error instanceof Error ? error.message : error);
      return response({ error: error instanceof Error ? error.message : "Email belum dapat dikirim." }, 500);
    }
  },
};
