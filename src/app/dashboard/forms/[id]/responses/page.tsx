export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Form, Submission } from "@/types/database.types";
import type { Metadata } from "next";
import { CsvExportButton } from "./CsvExportButton";
import { ResponseCards } from "./ResponseCards";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Respostas" };

export default async function ResponsesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !form) notFound();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("form_id", id)
    .order("created_at", { ascending: false });

  const typedForm = form as Form;
  const typedSubmissions = (submissions ?? []) as Submission[];

  // Filtrar campos que têm input (excluir statements)
  const inputFields = typedForm.fields.filter(f => f.type !== "statement");

  // Qual UTM exibir na tabela
  const utmParam = (typedForm.settings as { utmDisplayParam?: string | null }).utmDisplayParam ?? "utm_source";

  // Stats
  const today = new Date();
  const last7days = typedSubmissions.filter(s => {
    const d = new Date(s.created_at);
    return (today.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{typedForm.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {typedSubmissions.length} resposta{typedSubmissions.length !== 1 ? "s" : ""}
              {last7days > 0 && ` · ${last7days} esta semana`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {typedSubmissions.length > 0 && (
            <CsvExportButton form={typedForm} submissions={typedSubmissions} />
          )}

          {/* View tabs */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{ background: "rgba(125,131,189,0.15)", color: "#CBCDE5" }}>
              Tabela
            </span>
            <Link href={`/dashboard/forms/${id}/kanban`}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              Kanban
            </Link>
          </div>

          <Link
            href={`/dashboard/forms/${id}/edit`}
            className="text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {typedSubmissions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{typedSubmissions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total de respostas</p>
          </div>
          <div className="border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{last7days}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos 7 dias</p>
          </div>
          <div className="border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">
              {typedSubmissions.length > 0
                ? formatDate(typedSubmissions[0].created_at)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Última resposta</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {typedSubmissions.length === 0 && (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 text-center gap-3 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-10 w-10 opacity-30">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nenhuma resposta ainda</p>
            <p className="text-xs max-w-xs">
              {typedForm.is_published
                ? "Compartilhe o link do formulário para receber respostas."
                : "Publique o formulário primeiro para receber respostas."}
            </p>
          </div>
          {!typedForm.is_published && (
            <Link
              href={`/dashboard/forms/${id}/edit`}
              className="text-sm text-primary underline hover:no-underline"
            >
              Ir para o editor
            </Link>
          )}
        </div>
      )}

      {/* Cards de leads */}
      <ResponseCards form={typedForm} submissions={typedSubmissions} utmParam={utmParam} />
    </div>
  );
}
