import "npm:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer";

// CORS Headers untuk dipanggil dari Frontend (Browser)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default {
  async fetch(req: Request) {
    // Menangani preflight request CORS dari browser
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    try {
      const { to, subject, html, text } = await req.json();

      if (!to || !subject) {
        return new Response(
          JSON.stringify({ error: "Kolom 'to' dan 'subject' wajib diisi." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ambil kata sandi dari Supabase Secrets
      const smtpPassword = Deno.env.get("SMTP_PASSWORD");
      
      if (!smtpPassword) {
        throw new Error("SMTP_PASSWORD tidak ditemukan di Environment Variables / Secrets.");
      }

      // Konfigurasi Server Email (Sesuai foto: mx.kerjamail.co, SSL Port 465)
      const transporter = nodemailer.createTransport({
        host: "mx.kerjamail.co",
        port: 465,
        secure: true, // true untuk port 465 (SSL)
        auth: {
          user: "info@tslabschool.sch.id",
          pass: smtpPassword, 
        },
      });

      // Opsi Email
      const mailOptions = {
        from: `"TSLS Admin" <info@tslabschool.sch.id>`,
        to: to,
        subject: subject,
        text: text || "Harap gunakan aplikasi email yang mendukung HTML untuk melihat isi pesan ini.",
        html: html,
      };

      // Kirim Email
      const info = await transporter.sendMail(mailOptions);

      console.log("Email berhasil dikirim: %s", info.messageId);

      return new Response(
        JSON.stringify({ success: true, messageId: info.messageId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error("Gagal mengirim email:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};
