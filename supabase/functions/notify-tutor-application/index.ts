import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Email admins when a new tutor application is submitted.
 * Body: { full_name, email, phone, country, course }
 *
 * Tries to send via Resend if RESEND_API_KEY is configured.
 * Always inserts in-app notifications for admin/super_admin users as a fallback.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { full_name, email, phone, country, course } = body || {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Pull admin emails
    const { data: roles } = await sb
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin"]);

    const adminIds = (roles || []).map((r) => r.user_id);
    let adminEmails: string[] = [];
    if (adminIds.length > 0) {
      const { data: profs } = await sb
        .from("profiles")
        .select("email")
        .in("user_id", adminIds);
      adminEmails = (profs || []).map((p) => p.email).filter(Boolean);
    }

    // 2. Insert in-app notifications
    if (adminIds.length > 0) {
      await sb.from("notifications").insert(
        adminIds.map((id) => ({
          user_id: id,
          title: "New tutor application 📩",
          message: `${full_name || "A new user"} (${email || "no email"}) just registered as a tutor and is awaiting approval.`,
        }))
      );
    }

    // 3. Try email via Resend if available
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailResult: any = { sent: false, reason: "RESEND_API_KEY not set" };

    if (RESEND_API_KEY && adminEmails.length > 0) {
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc">
          <div style="background:#1E40AF;color:white;padding:24px;border-radius:12px 12px 0 0">
            <h1 style="margin:0;font-size:20px">📩 New Tutor Application</h1>
            <p style="margin:8px 0 0;opacity:.9;font-size:14px">Digital Learning Hub</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <p style="margin:0 0 16px;color:#334155">A new tutor has just registered and is awaiting your approval.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b">Name</td><td style="padding:6px 0;font-weight:600">${full_name || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${email || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${phone || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Country</td><td style="padding:6px 0">${country || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Primary course</td><td style="padding:6px 0">${course || "—"}</td></tr>
            </table>
            <p style="margin:24px 0 0;color:#475569;font-size:13px">Open the Admin Dashboard → Classrooms → Tutor Applications to review.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Powered by DLH</p>
        </div>
      `;

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DLH Notifications <onboarding@resend.dev>",
            to: adminEmails,
            subject: `📩 New tutor application: ${full_name || email || "Unknown"}`,
            html,
          }),
        });
        emailResult = { sent: resp.ok, status: resp.status };
        if (!resp.ok) emailResult.body = await resp.text();
      } catch (e) {
        emailResult = { sent: false, error: String(e) };
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notified_admins: adminIds.length, email: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify-tutor-application error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
