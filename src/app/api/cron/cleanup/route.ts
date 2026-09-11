import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ── Retenção: apaga submissions > 365 dias ────────────────────────────────────
// Rota chamada pelo Vercel Cron (diariamente, 03:00 UTC)
// Requer CRON_SECRET no header Authorization para evitar chamadas externas
// Usa service role para bypassar RLS

export async function GET(req: NextRequest) {
  // ── Auth do cron ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cleanup-cron] CRON_SECRET não definido");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Cliente service role (bypassa RLS) ────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[cleanup-cron] Env vars faltando");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const client = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Deletar submissions com > 365 dias ────────────────────────────────────
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);
  const cutoffIso = cutoffDate.toISOString();

  const { error, count } = await client
    .from("submissions")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  if (error) {
    console.error("[cleanup-cron] Erro ao deletar:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cleanup-cron] Deletadas ${count ?? 0} submissions anteriores a ${cutoffIso}`);
  return NextResponse.json({
    ok: true,
    deleted: count ?? 0,
    cutoff: cutoffIso,
  });
}
