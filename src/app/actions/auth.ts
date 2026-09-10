"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Sign Up ─────────────────────────────────────────────────────────────────
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    redirect("/signup?error=Preencha+todos+os+campos");
  }

  if (password.length < 8) {
    redirect("/signup?error=Senha+deve+ter+ao+menos+8+caracteres");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });

  if (error) {
    const msg = encodeURIComponent(error.message);
    redirect(`/signup?error=${msg}`);
  }

  redirect("/signup?success=Verifique+seu+email+para+confirmar+a+conta");
}

// ─── Sign In ─────────────────────────────────────────────────────────────────
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    redirect("/login?error=Preencha+email+e+senha");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=Email+ou+senha+inv%C3%A1lidos");
  }

  redirect(redirectTo);
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
