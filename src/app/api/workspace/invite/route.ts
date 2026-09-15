import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // Resolve active workspace (member in someone else's workspace → use their id)
  const { ownerId, role } = await resolveWorkspaceContext(user.id);

  // Only owner and admin can invite
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para convidar membros." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const { email, role: inviteRole = "member", accessToken } = body as { email?: string; role?: string; accessToken?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (!["admin", "member", "viewer"].includes(inviteRole)) {
    return NextResponse.json({ error: "Role inválido." }, { status: 400 });
  }
  // Only owner can grant admin role
  if (inviteRole === "admin" && role !== "owner") {
    return NextResponse.json({ error: "Apenas o dono do workspace pode promover a Admin." }, { status: 403 });
  }
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Não é possível convidar a si mesmo." }, { status: 400 });
  }
  if (!accessToken || !/^\d{6}$/.test(accessToken.trim())) {
    return NextResponse.json({ error: "Token de acesso deve ter exatamente 6 dígitos numéricos." }, { status: 400 });
  }
  const cleanToken = accessToken.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Check if already a member of THIS workspace
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: existing } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", ownerId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Usuário já é membro do workspace." }, { status: 409 });
    }
  }

  // Create invitation for the ACTIVE workspace (ownerId)
  const { data: inv, error } = await admin
    .from("workspace_invitations")
    .insert({
      workspace_id: ownerId,          // ← always the active workspace owner
      email: email.toLowerCase(),
      role: inviteRole,
      invited_by: user.id,            // who sent the invite
      token: cleanToken,
      expires_at: "2099-12-31T23:59:59Z",
    })
    .select("token")
    .single();

  if (error) {
    const isTokenConflict = error.code === "23505";
    console.error("[invite] insert error:", error);
    return NextResponse.json({
      error: isTokenConflict
        ? "Este token já está em uso. Escolha outro."
        : error.message,
    }, { status: isTokenConflict ? 409 : 500 });
  }

  const accessUrl = `${APP_URL}/acesso`;
  const callbackUrl = `${APP_URL}/auth/confirm?next=${encodeURIComponent(`/invite/${cleanToken}`)}`;

  let magicLinkUrl = accessUrl;
  let emailSent = false;
  let emailError: string | null = null;

  try {
    const authAdmin = createAdminClient();
    const { data: linkData, error: linkError } = await authAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: { redirectTo: callbackUrl },
    });
    if (!linkError && linkData?.properties?.action_link) {
      magicLinkUrl = linkData.properties.action_link;
    }
  } catch { /* fallback */ }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", ownerId)
      .single();
    const ownerName = ownerProfile?.name ?? user.email ?? "Alguém";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const ROLE_LABELS: Record<string, string> = {
      admin: "Administrador", member: "Membro", viewer: "Visualizador",
    };
    const roleLabel = ROLE_LABELS[inviteRole] ?? inviteRole;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `DonForms <${fromEmail}>`,
        to: [email],
        subject: `${ownerName} convidou você para o DonForms`,
        html: `
          <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;background:#06060e;padding:40px 32px;border-radius:16px;">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#9ea8ff,#7c87ff);display:flex;align-items:center;justify-content:center;margin-bottom:28px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/></svg>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#f0f2ff;margin:0 0 10px;">Você foi convidado ao DonForms</h1>
            <p style="font-size:15px;color:#8b90b8;line-height:1.6;margin:0 0 24px;">
              <strong style="color:#c8ccf0;">${ownerName}</strong> convidou você como
              <strong style="color:#9ea8ff;">${roleLabel}</strong>.
            </p>
            <div style="padding:20px 24px;background:rgba(158,168,255,0.08);border:2px solid rgba(158,168,255,0.2);border-radius:14px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:11px;color:#5c6180;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Seu token de acesso</p>
              <p style="margin:0;font-size:36px;font-weight:800;color:#9ea8ff;font-family:monospace;letter-spacing:0.18em;">${cleanToken}</p>
            </div>
            <div style="margin-bottom:24px;padding:14px 16px;background:rgba(255,255,255,0.03);border-radius:10px;">
              <p style="margin:0 0 4px;font-size:13px;color:#c8ccf0;font-weight:600;">Como acessar:</p>
              <p style="margin:0;font-size:13px;color:#5c6180;line-height:1.6;">
                1. Acesse <strong style="color:#9ea8ff;">${APP_URL}/acesso</strong><br>
                2. Digite o token acima<br>
                3. Pronto — você estará no workspace
              </p>
            </div>
            ${magicLinkUrl !== accessUrl ? `<a href="${magicLinkUrl}" style="display:inline-block;background:linear-gradient(135deg,#9ea8ff,#7c87ff);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:16px;">Ou clique aqui para entrar direto →</a>` : ""}
            <p style="margin:16px 0 0;font-size:12px;color:#3d4060;line-height:1.6;">Token permanente — guarde-o com segurança.</p>
          </div>
        `,
      }),
    }).catch((e: unknown) => { emailError = String(e); return null; });

    if (resendRes?.ok) emailSent = true;
    else if (resendRes) {
      const errBody = await resendRes.json().catch(() => ({}));
      emailError = `Resend ${resendRes.status}: ${JSON.stringify(errBody)}`;
      console.error("[invite] Resend error:", emailError);
    }
  } else {
    emailError = "RESEND_API_KEY não configurada";
  }

  return NextResponse.json({ ok: true, accessUrl, accessToken: inv.token ?? cleanToken, emailSent, emailError });
}
