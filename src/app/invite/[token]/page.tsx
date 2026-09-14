import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aceitar convite — DonForms" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → to /acesso (token-based login)
  if (!user) {
    redirect(`/acesso?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // Use admin client to bypass RLS for invite lookup
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const { data: inv, error: invErr } = await adminAny
    .from("workspace_invitations")
    .select("id, email, role, workspace_id, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr) {
    console.error("[invite] lookup error:", invErr.message);
  }

  const Logo = () => (
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 28, boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
      </svg>
    </div>
  );

  const cardStyle = {
    width: "100%", maxWidth: 440,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: "40px 36px",
  };

  const page = (content: React.ReactNode) => (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#06060e", fontFamily: "system-ui,-apple-system,sans-serif", padding: 24,
    }}>
      <div style={cardStyle}>
        <Logo />
        {content}
      </div>
    </div>
  );

  // ── Invite not found ────────────────────────────────────────────────────────
  if (!inv) {
    return page(
      <>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
          Convite não encontrado
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
          Este código de acesso não existe. Verifique o código recebido no email.
        </p>
        <a href="/dashboard" style={{
          display: "inline-block", padding: "12px 22px", borderRadius: 10,
          background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          border: "1px solid rgba(158,168,255,0.2)",
        }}>
          Ir para o Dashboard
        </a>
      </>
    );
  }

  // ── Email mismatch: logged in as wrong account ──────────────────────────────
  const emailMatch = inv.email?.toLowerCase() === user.email?.toLowerCase();
  if (!emailMatch) {
    return page(
      <>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
          Conta incorreta
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
          Este convite é para <strong style={{ color: "rgba(255,255,255,0.7)" }}>{inv.email}</strong>,
          mas você está logado como <strong style={{ color: "#ff7070" }}>{user.email}</strong>.
        </p>
        <a href="/dashboard" style={{
          display: "inline-block", padding: "11px 20px", borderRadius: 10,
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>
          Ir para o Dashboard
        </a>
      </>
    );
  }

  const cookieStore = await cookies();

  // ── Already accepted: just set cookie and redirect ─────────────────────────
  if (inv.accepted_at) {
    cookieStore.set("_df_wid", inv.workspace_id, {
      path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90,
    });
    redirect("/dashboard");
  }

  // ── Accept the invitation ───────────────────────────────────────────────────
  // 1. Mark accepted_at
  const { error: acceptErr } = await adminAny
    .from("workspace_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  if (acceptErr) {
    console.error("[invite] accept error:", acceptErr.message);
  }

  // 2. Add to workspace_members (ignore conflict if already member)
  const { error: memberErr } = await adminAny
    .from("workspace_members")
    .upsert(
      {
        workspace_id: inv.workspace_id,
        user_id: user.id,
        role: inv.role ?? "member",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id" }
    );

  if (memberErr) {
    console.error("[invite] member upsert error:", memberErr.message);
  }

  // 3. Set active workspace cookie
  cookieStore.set("_df_wid", inv.workspace_id, {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90,
  });

  redirect("/dashboard?welcome=1");
}
