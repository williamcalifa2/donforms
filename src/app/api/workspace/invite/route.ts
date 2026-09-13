import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const { email, role = "member" } = body as { email?: string; role?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (!["admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Role inválido." }, { status: 400 });
  }

  // Prevent self-invite
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Não é possível convidar a si mesmo." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Check if already a member
  const { data: existing } = await client
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", user.id)
    .eq("user_id", (await client.from("profiles").select("id").eq("email", email).maybeSingle())?.data?.id ?? "")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Usuário já é membro do workspace." }, { status: 409 });
  }

  // Create invitation
  const { data: inv, error } = await client
    .from("workspace_invitations")
    .insert({ workspace_id: user.id, email: email.toLowerCase(), role, invited_by: user.id })
    .select("token")
    .single();

  if (error) {
    console.error("[invite] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const acceptUrl = `${APP_URL}/invite/${inv.token}`;

  // Send invite email via Resend (if configured)
  const resendKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  let emailError: string | null = null;

  if (resendKey) {
    const { data: ownerProfile } = await client
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const ownerName = ownerProfile?.name ?? user.email ?? "Alguém";

    // RESEND_FROM_EMAIL deve ser de domínio verificado no Resend.
    // Fallback: onboarding@resend.dev (domínio oficial Resend, sem verificação necessária).
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const fromLabel = fromEmail === "onboarding@resend.dev" ? "DonForms" : "DonForms";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${fromLabel} <${fromEmail}>`,
        to: [email],
        subject: `${ownerName} convidou você para o DonForms`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
            <div style="margin-bottom:32px;">
              <div style="width:40px;height:40px;background:linear-gradient(135deg,#6c63ff,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="color:#fff;font-size:18px;">⚡</span>
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#0f0f1a;margin:0 0 8px;">
                Você foi convidado para o DonForms
              </h1>
              <p style="color:#666;font-size:15px;margin:0;">
                <strong>${ownerName}</strong> convidou você como <strong>${role}</strong> no workspace deles.
              </p>
            </div>
            <a href="${acceptUrl}"
              style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">
              Aceitar convite →
            </a>
            <p style="color:#999;font-size:12px;margin:0;">
              Este link expira em 7 dias. Se você não esperava este convite, ignore este email.
            </p>
          </div>
        `,
      }),
    }).catch((e) => { emailError = String(e); return null; });

    if (resendRes) {
      if (resendRes.ok) {
        emailSent = true;
      } else {
        const errBody = await resendRes.json().catch(() => ({}));
        emailError = `Resend ${resendRes.status}: ${JSON.stringify(errBody)}`;
        console.error("[invite] Resend error:", emailError);
      }
    }
  } else {
    emailError = "RESEND_API_KEY não configurada";
    console.warn("[invite] email not sent:", emailError);
  }

  return NextResponse.json({ ok: true, acceptUrl, emailSent, emailError });
}
