import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Create invitation record (token stored in DB)
  const { data: inv, error } = await client
    .from("workspace_invitations")
    .insert({ workspace_id: user.id, email: email.toLowerCase(), role, invited_by: user.id })
    .select("token")
    .single();

  if (error) {
    console.error("[invite] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const invitePageUrl = `${APP_URL}/invite/${inv.token}`;
  // Supabase redirects to /auth/confirm which exchanges the PKCE code,
  // then redirects to /invite/{token} where the invite is auto-accepted.
  const callbackUrl = `${APP_URL}/auth/confirm?next=${encodeURIComponent(`/invite/${inv.token}`)}`;

  // ── Generate Supabase magic link (no account creation required) ──────────
  let magicLinkUrl = invitePageUrl; // fallback: just the invite page URL
  let emailSent = false;
  let emailError: string | null = null;

  try {
    const admin = createAdminClient();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (linkError) {
      console.warn("[invite] generateLink error:", linkError.message);
      // fallback to plain invite URL — person will still need to log in
    } else if (linkData?.properties?.action_link) {
      magicLinkUrl = linkData.properties.action_link;
    }
  } catch (e) {
    console.warn("[invite] admin client error:", e);
    // SUPABASE_SERVICE_ROLE_KEY not configured — use plain invite link
  }

  // ── Send via Resend ───────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const { data: ownerProfile } = await client
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const ownerName = ownerProfile?.name ?? user.email ?? "Alguém";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const ROLE_LABELS: Record<string, string> = {
      admin: "Administrador", member: "Membro", viewer: "Visualizador",
    };
    const roleLabel = ROLE_LABELS[role] ?? role;

    const hasMagicLink = magicLinkUrl !== invitePageUrl;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `DonForms <${fromEmail}>`,
        to: [email],
        subject: `${ownerName} convidou você para o DonForms`,
        html: `
          <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;background:#06060e;padding:40px 32px;border-radius:16px;">
            <!-- Logo -->
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#9ea8ff,#7c87ff);display:flex;align-items:center;justify-content:center;margin-bottom:28px;box-shadow:0 8px 24px rgba(158,168,255,0.3);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/></svg>
            </div>

            <h1 style="font-size:22px;font-weight:700;color:#f0f2ff;margin:0 0 10px;letter-spacing:-0.3px;">
              Você foi convidado ao DonForms
            </h1>
            <p style="font-size:15px;color:#8b90b8;line-height:1.6;margin:0 0 28px;">
              <strong style="color:#c8ccf0;">${ownerName}</strong> convidou você como
              <strong style="color:#9ea8ff;">${roleLabel}</strong> no workspace deles.
              ${hasMagicLink
                ? "Clique no botão abaixo para entrar <strong style=\"color:#f0f2ff;\">sem precisar criar conta</strong> — acesso instantâneo."
                : "Clique no botão abaixo para aceitar o convite."}
            </p>

            <!-- CTA -->
            <a href="${magicLinkUrl}"
              style="display:inline-block;background:linear-gradient(135deg,#9ea8ff,#7c87ff);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:-0.2px;box-shadow:0 8px 24px rgba(158,168,255,0.3);">
              ${hasMagicLink ? "Entrar no workspace →" : "Aceitar convite →"}
            </a>

            ${hasMagicLink ? `
            <div style="margin:20px 0;padding:14px 16px;background:rgba(158,168,255,0.06);border:1px solid rgba(158,168,255,0.12);border-radius:10px;">
              <p style="margin:0;font-size:13px;color:#9ea8ff;font-weight:600;">✨ Acesso sem senha</p>
              <p style="margin:4px 0 0;font-size:12px;color:#5c6180;line-height:1.5;">
                Este link autentica você automaticamente. Não é necessário criar conta ou lembrar senha.
              </p>
            </div>
            ` : ""}

            <p style="margin:24px 0 0;font-size:12px;color:#3d4060;line-height:1.6;">
              Este link expira em 24 horas e é de uso único.<br>
              Se você não esperava este convite, ignore este email.
            </p>
          </div>
        `,
      }),
    }).catch((e: unknown) => { emailError = String(e); return null; });

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

  return NextResponse.json({ ok: true, acceptUrl: invitePageUrl, emailSent, emailError });
}
