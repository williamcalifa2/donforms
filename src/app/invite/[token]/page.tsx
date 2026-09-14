import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aceitar convite — DonForms" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → redirect to login (fallback: user arrived without magic link)
  if (!user) {
    redirect(`/login?redirectTo=/invite/${encodeURIComponent(token)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Get invitation details
  const { data: invData } = await client.rpc("get_invitation_by_token", { p_token: token });
  const inv = invData as {
    ok: boolean;
    error?: string;
    email?: string;
    role?: string;
    workspace_id?: string;
    owner_name?: string;
    expires_at?: string;
  } | null;

  // ── Auto-accept: user came via magic link and email matches ───────────────
  const emailMatch = inv?.email?.toLowerCase() === user.email?.toLowerCase();
  if (inv?.ok && emailMatch) {
    const { data } = await client.rpc("accept_workspace_invitation", {
      p_token: token,
      p_user_id: user.id,
    });

    if (data?.ok) {
      const cookieStore = await cookies();
      cookieStore.set("_df_wid", inv.workspace_id!, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90,
      });
      redirect("/dashboard?welcome=1");
    }
    // If accept failed (already accepted, etc.) → fall through to show page
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador", member: "Membro", viewer: "Visualizador",
  };
  const roleLabel = ROLE_LABELS[inv?.role ?? "member"] ?? inv?.role ?? "Membro";

  // ── Email mismatch: logged in as different account ────────────────────────
  const emailMismatch = inv?.ok && !emailMatch;

  const cardStyle = {
    width: "100%", maxWidth: 440,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: "40px 36px",
  };

  const Logo = () => (
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 28,
      boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
      </svg>
    </div>
  );

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#06060e", fontFamily: "system-ui,-apple-system,sans-serif", padding: 24,
    }}>
      <div style={cardStyle}>
        <Logo />

        {/* Invalid invite */}
        {!inv?.ok && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
              Convite inválido
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              {inv?.error ?? "Este convite não existe, expirou ou já foi aceito."}
            </p>
            <a href="/dashboard" style={{
              display: "inline-block", marginTop: 28, padding: "12px 22px", borderRadius: 10,
              background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
              border: "1px solid rgba(158,168,255,0.2)",
            }}>
              Ir para o Dashboard
            </a>
          </>
        )}

        {/* Email mismatch: logged in as wrong account */}
        {emailMismatch && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
              Conta incorreta
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
              Este convite é para <strong style={{ color: "rgba(255,255,255,0.7)" }}>{inv?.email}</strong>,
              mas você está logado como <strong style={{ color: "#ff7070" }}>{user.email}</strong>.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Use o link do email na conta correta, ou peça um novo convite ao administrador do workspace.
            </p>
            <a href="/dashboard" style={{
              display: "inline-block", marginTop: 24, padding: "11px 20px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Ir para o Dashboard
            </a>
          </>
        )}

        {/* Valid invite but accept failed (e.g. already accepted) — manual fallback */}
        {inv?.ok && emailMatch && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>
              Convite já processado
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 24 }}>
              Este convite já foi aceito ou expirou.
            </p>
            <a href="/dashboard" style={{
              display: "inline-block", padding: "13px 24px", borderRadius: 12,
              background: "linear-gradient(135deg,#9ea8ff,#7c87ff)", color: "#fff",
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
            }}>
              Ir para o Dashboard →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
