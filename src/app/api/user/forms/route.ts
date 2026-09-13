import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value ?? user.id;

  const { data: forms } = await client
    .from("forms")
    .select("id, title, settings, is_published")
    .eq("user_id", wid)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ forms: forms ?? [] });
}
