/**
 * /invite/[token] — redireciona para o route handler que aceita o convite.
 * Aceitar convite (setar cookies) só pode ser feito em Route Handlers/Server Actions.
 */
import { redirect } from "next/navigation";
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

  // Not logged in → /acesso
  if (!user) {
    redirect(`/acesso`);
  }

  // Check if invite exists and email matches before redirecting
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const { data: inv } = await adminAny
    .from("workspace_invitations")
    .select("id, email, role, workspace_id, accepted_at")
    .eq("token", token)
    .maybeSingle();

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
      <div style={cardStyle}><Logo />{content}</div>
    </div>
  );

  // Token not found
  if (!inv) {
    return page(
      <>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
          Código não encontrado
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
          Este código de acesso não existe. Verifique o código recebido no email.
        </p>
        <a href="/dashboard" style={{
          display: "inline-block", padding: "12px 22px", borderRadius: 10,
          background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          border: "1px solid rgba(158,168,255,0.2)",
        }}>Ir para o Dashboard</a>
      </>
    );
  }

  // Email mismatch
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
        }}>Ir para o Dashboard</a>
      </>
    );
  }

  // All good → route handler handles cookie + workspace join + redirect
  redirect(`/api/invite/accept?token=${encodeURIComponent(token)}`);
}
