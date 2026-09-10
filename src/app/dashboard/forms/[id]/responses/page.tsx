import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Form, Submission } from "@/types/database.types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Respostas" };

export default async function ResponsesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{typedForm.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {typedSubmissions.length} resposta{typedSubmissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/forms/${id}/edit`}
          className="text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 transition-colors"
        >
          Editar formulário
        </Link>
      </div>

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
        </div>
      )}

      {/* Tabela de respostas */}
      {typedSubmissions.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Data
                  </th>
                  {typedForm.fields.map((field) => (
                    <th
                      key={field.id}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground max-w-[200px]"
                    >
                      <span className="truncate block">{field.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {typedSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>
                    {typedForm.fields.map((field) => {
                      const answer = sub.answers[field.id];
                      const display = Array.isArray(answer)
                        ? answer.join(", ")
                        : answer != null
                        ? String(answer)
                        : "—";
                      return (
                        <td
                          key={field.id}
                          className="px-4 py-3 text-xs max-w-[200px]"
                        >
                          <span className="line-clamp-2">{display}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
