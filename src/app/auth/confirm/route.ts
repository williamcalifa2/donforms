/**
 * Supabase auth callback — troca o `code` PKCE por sessão,
 * depois redireciona para `next` (padrão: /dashboard).
 *
 * Usado por: magic links de convite, email confirmation, etc.
 * URL configurada no Resend invite como redirectTo=/auth/confirm?next=/invite/{token}
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code    = searchParams.get("code");
  const next    = searchParams.get("next") ?? "/dashboard";
  const errParam = searchParams.get("error");
  const errDesc  = searchParams.get("error_description");

  // Auth error forwarded by Supabase
  if (errParam) {
    console.error("[auth/confirm] Supabase error:", errParam, errDesc);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errDesc ?? errParam)}`
    );
  }

  if (!code) {
    // No code → just redirect to next (might already be authenticated)
    return NextResponse.redirect(`${origin}${next}`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Link expirado ou inválido. Peça um novo convite.")}`
    );
  }

  // Session set — redirect to intended destination
  return NextResponse.redirect(`${origin}${next}`);
}
