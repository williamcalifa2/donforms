export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NewFormButton } from "@/components/dashboard/NewFormButton";
import { FormCard } from "@/components/dashboard/FormCard";
import type { FormWithCount } from "@/types/database.types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Determine active workspace from cookie (validated against memberships)
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  let activeWorkspaceId = user.id;
  if (wid && wid !== user.id) {
    const { data: membership } = await client
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", wid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) activeWorkspaceId = wid;
  }

  const { data: forms } = await supabase
    .from("forms_with_submission_count")
    .select("*")
    .eq("user_id", activeWorkspaceId)
    .order("created_at", { ascending: false });

  const list = (forms ?? []) as FormWithCount[];

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {pageError && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          ❌ {decodeURIComponent(pageError)}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Formulários
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {list.length === 0
              ? "Crie seu primeiro formulário inteligente"
              : `${list.length} formulário${list.length > 1 ? "s" : ""} no workspace`}
          </p>
        </div>
        <NewFormButton />
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 px-6 text-center gap-4"
          style={{ border: "2px dashed rgba(255,255,255,0.08)" }}
        >
          <div className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-6 w-6">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              Nenhum formulário ainda
            </p>
            <p className="text-xs max-w-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Crie formulários conversacionais e compartilhe com o mundo.
            </p>
          </div>
          <NewFormButton />
        </div>
      )}

      {/* Grid */}
      {list.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((form) => (
            <FormCard key={form.id} form={form} appUrl={APP_URL} />
          ))}
        </div>
      )}
    </div>
  );
}
