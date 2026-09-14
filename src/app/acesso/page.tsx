/**
 * /acesso — Token de acesso para convites
 * Pessoa digita o token recebido no email → server valida → gera magic link silencioso → redirect
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acessar workspace — DonForms" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

async function acessarComToken(formData: FormData) {
  "use server";

  const raw = (formData.get("token") as string | null)?.trim() ?? "";
  const token = raw.replace(/\D/g, ""); // digits only
  if (!/^\d{6}$/.test(token)) {
    redirect(`/acesso?erro=token_invalido`);
  }

  // Check if user is already logged in
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Already authenticated — try to accept invite directly
    redirect(`/invite/${encodeURIComponent(token)}`);
  }

  // Use admin client to bypass RLS for token lookup (user is not authenticated yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: inv, error: invErr } = await admin
    .from("workspace_invitations")
    .select("email, token, workspace_id, role, expires_at")
    .eq("token", token)
    .is("accepted_at", null)
    .maybeSingle();

  if (invErr || !inv) {
    redirect(`/acesso?erro=token_nao_encontrado`);
  }

  // Check expiry (2099 = permanent token, skip check)
  if (inv.expires_at && inv.expires_at !== "2099-12-31T23:59:59+00:00" && new Date(inv.expires_at) < new Date()) {
    redirect(`/acesso?erro=token_expirado`);
  }

  // ── Gera OTP via admin e verifica server-side (sem redirecionar para Supabase) ──
  // generateLink retorna email_otp (raw OTP) que podemos verificar server-side
  // com supabase.auth.verifyOtp — seta cookies de sessão diretamente.
  const adminAuth = createAdminClient();
  const { data: linkData, error: linkErr } = await adminAuth.auth.admin.generateLink({
    type: "magiclink",
    email: inv.email,
    options: { redirectTo: `${APP_URL}/dashboard` }, // fallback; não será usado
  });

  if (linkErr || !linkData?.properties?.email_otp) {
    const detail = linkErr?.message ?? "no_otp";
    console.error("[acesso] generateLink error:", detail);
    redirect(`/acesso?erro=erro_interno&detail=${encodeURIComponent(detail)}`);
  }

  const otp = linkData.properties.email_otp;

  // Verificar OTP server-side → seta sessão via cookies (SSR client)
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email: inv.email,
    token: otp,
    type: "email",
  });

  if (verifyErr) {
    console.error("[acesso] verifyOtp error:", verifyErr.message);
    redirect(`/acesso?erro=erro_interno&detail=${encodeURIComponent(verifyErr.message)}`);
  }

  // Sessão setada via cookies — redireciona direto para aceitar convite
  redirect(`/invite/${token}`);
}

interface Props {
  searchParams: Promise<{ erro?: string; detail?: string }>;
}

const ERROS: Record<string, string> = {
  token_invalido: "Código inválido. Digite os 6 dígitos do email.",
  token_nao_encontrado: "Token não encontrado ou já foi usado.",
  token_expirado: "Este token expirou. Peça um novo convite.",
  erro_interno: "Erro ao processar. Tente novamente.",
};

export default async function AcessoPage({ searchParams }: Props) {
  const { erro, detail } = await searchParams;
  const errMsg = erro ? (ERROS[erro] ?? "Erro desconhecido.") : null;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#06060e",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      padding: "24px 16px",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 600,
        height: 400,
        background: "radial-gradient(ellipse at center, rgba(158,168,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "40px 36px",
        position: "relative",
      }}>
        {/* Gradient top accent */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #9ea8ff, #7c87ff, #9ea8ff)",
          borderRadius: "20px 20px 0 0",
        }} />

        {/* Logo */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          margin: "0 0 8px",
          letterSpacing: "-0.3px",
        }}>
          Acessar workspace
        </h1>
        <p style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.4)",
          margin: "0 0 28px",
          lineHeight: 1.6,
        }}>
          Digite o código de 6 dígitos que você recebeu no email do convite.
        </p>

        {/* Error */}
        {errMsg && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 13,
            color: "#ff7070",
          }}>
            {errMsg}
            {detail && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ff9090", fontFamily: "monospace", wordBreak: "break-all" }}>
                {detail}
              </p>
            )}
          </div>
        )}

        <form action={acessarComToken}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              Token de acesso
            </label>
            <input
              name="token"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              minLength={6}
              maxLength={6}
              autoComplete="off"
              autoFocus
              placeholder="000000"
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(158,168,255,0.25)",
                borderRadius: 10,
                color: "#9ea8ff",
                fontSize: 18,
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: "0.05em",
                outline: "none",
                boxSizing: "border-box",
                caretColor: "#9ea8ff",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px 24px",
              background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "-0.2px",
              boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
            }}
          >
            Entrar →
          </button>
        </form>

        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
          lineHeight: 1.6,
        }}>
          Não tem o código? Peça um convite ao administrador do workspace.
        </p>
      </div>
    </div>
  );
}
