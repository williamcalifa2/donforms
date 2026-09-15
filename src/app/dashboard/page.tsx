export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";
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

  // Resolve active workspace (verifies membership, returns effective owner id)
  const { ownerId } = await resolveWorkspaceContext(user.id);

  // Use admin client to bypass RLS — forms belong to workspace owner, not the visiting member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as any;

  const { data: forms } = await adminClient
    .from("forms_with_submission_count")
    .select("*")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  const list = (forms ?? []) as FormWithCount[];

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {pageError && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "hsl(var(--destructive) / .1)", border: "1px solid hsl(var(--destructive) / .2)", color: "hsl(var(--destructive))" }}>
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
          style={{ border: "2px dashed var(--card-border)" }}
        >
          <div className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-soft)", color: "var(--accent-c)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-6 w-6">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              Nenhum formulário ainda
            </p>
            <p className="text-xs max-w-xs" style={{ color: "var(--text-tertiary)" }}>
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
