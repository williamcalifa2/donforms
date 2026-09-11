import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import type { Form, Submission } from "@/types/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kanban" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KanbanPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: form, error } = await client
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: Form | null; error: unknown };

  if (error || !form) notFound();

  const { data: submissions } = await client
    .from("submissions")
    .select("*")
    .eq("form_id", id)
    .order("created_at", { ascending: false }) as { data: Submission[] | null };

  const typedSubmissions = (submissions ?? []) as Submission[];
  const inputFields = form.fields.filter((f: { type: string }) => f.type !== "statement");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            ← Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{form.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {typedSubmissions.length} lead{typedSubmissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View tabs */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Link
              href={`/dashboard/forms/${id}/responses`}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Tabela
            </Link>
            <span
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{ background: "rgba(125,131,189,0.15)", color: "#CBCDE5" }}
            >
              Kanban
            </span>
          </div>
          {/* Botão editor separado — abre outra página */}
          <Link
            href={`/dashboard/forms/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "11px", height: "11px" }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar form
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {typedSubmissions.length === 0 && (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 text-center gap-3 text-muted-foreground">
          <span className="text-4xl">📭</span>
          <p className="text-sm font-medium">Nenhum lead ainda</p>
          <p className="text-xs">Compartilhe o formulário para receber leads.</p>
        </div>
      )}

      {/* Board */}
      {typedSubmissions.length > 0 && (
        <KanbanBoard
          submissions={typedSubmissions}
          fields={inputFields}
        />
      )}
    </div>
  );
}
