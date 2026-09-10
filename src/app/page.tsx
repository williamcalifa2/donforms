import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Usuário autenticado → dashboard
  // Não autenticado → login
  // (O middleware também faz esse controle, mas ter aqui é mais explícito)
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
