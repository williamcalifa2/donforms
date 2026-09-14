"use client";

/**
 * /auth/confirm — processa autenticação Supabase no cliente.
 *
 * Suporte a dois fluxos:
 *   1. PKCE (?code=...)  — exchangeCodeForSession explícito
 *   2. Implicit (#access_token=...) — Supabase JS auto-detecta no init
 *
 * `admin.auth.admin.generateLink` usa implicit flow (hash fragment).
 * Route Handlers nunca recebem o hash — precisa de Client Component.
 */

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    const next = searchParams.get("next") ?? "/dashboard";
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (errorParam) {
      router.replace(`/login?error=${encodeURIComponent(errorDesc ?? errorParam)}`);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    async function handle() {
      if (done.current) return;

      // ── Caso 1: PKCE — ?code= na URL ──────────────────────────────────────
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        done.current = true;
        if (error) {
          router.replace(`/login?error=${encodeURIComponent("Link expirado ou inválido.")}`);
        } else {
          router.replace(next);
        }
        return;
      }

      // ── Caso 2: Implicit — #access_token= no hash ─────────────────────────
      // Supabase JS processa o hash automaticamente no init.
      // Checamos a sessão já disponível:
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        done.current = true;
        router.replace(next);
        return;
      }

      // Aguarda o evento SIGNED_IN (hash ainda sendo processado):
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session && !done.current) {
          done.current = true;
          subscription.unsubscribe();
          router.replace(next);
        }
      });

      // Fallback: se nenhum evento em 10s, redireciona para login
      setTimeout(() => {
        if (!done.current) {
          done.current = true;
          subscription.unsubscribe();
          router.replace("/login?error=" + encodeURIComponent("Link expirado. Peça um novo convite."));
        }
      }, 10_000);
    }

    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#06060e",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 8px 24px rgba(158,168,255,0.3)",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
          </svg>
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          Autenticando...
        </p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirmInner />
    </Suspense>
  );
}
