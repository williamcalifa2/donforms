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

  if (!user) {
    redirect(`/login?redirect=/invite/${encodeURIComponent(token)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Get invitation details via security-definer RPC
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

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    member: "Membro",
    viewer: "Visualizador",
  };

  const roleLabel = ROLE_LABELS[inv?.role ?? "member"] ?? inv?.role ?? "Membro";

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#06060e",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "40px 36px",
      }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28,
          boxShadow: "0 8px 24px rgba(108,99,255,0.35)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
          </svg>
        </div>

        {!inv?.ok ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>
              Convite inválido
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              {inv?.error ?? "Este convite não existe, expirou ou já foi aceito."}
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block", marginTop: 28,
                padding: "12px 22px", borderRadius: 10,
                background: "rgba(108,99,255,0.15)",
                color: "#a5a0ff",
                fontSize: 14, fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(108,99,255,0.2)",
              }}
            >
              Ir para o Dashboard
            </a>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>
              Você foi convidado
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: "rgba(255,255,255,0.75)" }}>{inv.owner_name}</strong>{" "}
              convidou você para participar do workspace deles como{" "}
              <strong style={{ color: "#a5a0ff" }}>{roleLabel}</strong>.
            </p>

            {/* Accept form */}
            <AcceptForm token={token} userId={user.id} workspaceId={inv.workspace_id!} />
          </>
        )}
      </div>
    </div>
  );
}

// Server action component for accepting the invite
function AcceptForm({ token, userId, workspaceId }: { token: string; userId: string; workspaceId: string }) {
  async function accept() {
    "use server";
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    const { data } = await client.rpc("accept_workspace_invitation", {
      p_token: token,
      p_user_id: userId,
    });

    if (data?.ok) {
      // Set active workspace cookie
      const cookieStore = await cookies();
      cookieStore.set("_df_wid", workspaceId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90,
      });
      redirect("/dashboard");
    } else {
      redirect(`/invite/${token}?error=${encodeURIComponent(data?.error ?? "Erro ao aceitar convite.")}`);
    }
  }

  return (
    <form action={accept}>
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "13px 0",
          borderRadius: 12,
          background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
          color: "#fff",
          fontSize: 16, fontWeight: 700,
          border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(108,99,255,0.35)",
          fontFamily: "inherit",
          letterSpacing: "-0.2px",
        }}
      >
        Aceitar convite →
      </button>
      <a
        href="/dashboard"
        style={{
          display: "block", textAlign: "center", marginTop: 14,
          fontSize: 13, color: "rgba(255,255,255,0.3)",
          textDecoration: "none",
        }}
      >
        Recusar e ir para o Dashboard
      </a>
    </form>
  );
}
