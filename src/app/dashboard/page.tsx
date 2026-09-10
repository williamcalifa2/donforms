import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { FormWithCount } from "@/types/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: forms } = await supabase
    .from("forms_with_submission_count")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const list = (forms ?? []) as FormWithCount[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Meus formulários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {list.length === 0
              ? "Crie seu primeiro formulário"
              : `${list.length} formulário${list.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Fase 3: botão vai criar form e redirecionar pro editor */}
        <Button asChild>
          <Link href="/dashboard/forms/new">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Novo formulário
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm">Nenhum formulário ainda</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Crie seu primeiro formulário conversacional e compartilhe com o mundo.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/forms/new">Criar primeiro formulário</Link>
          </Button>
        </div>
      )}

      {/* Grid de forms */}
      {list.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((form) => (
            <div
              key={form.id}
              className="group relative border rounded-xl p-5 bg-card hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    form.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      form.is_published ? "bg-green-500" : "bg-zinc-400"
                    }`}
                  />
                  {form.is_published ? "Publicado" : "Rascunho"}
                </span>

                <span className="text-xs text-muted-foreground">
                  {form.submission_count} resposta{form.submission_count !== 1 ? "s" : ""}
                </span>
              </div>

              <h2 className="font-medium text-sm truncate mb-1">{form.title}</h2>
              <p className="text-xs text-muted-foreground">
                {formatDate(form.updated_at)}
              </p>

              {/* Actions — aparecem no hover */}
              <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/dashboard/forms/${form.id}/edit`}>Editar</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/forms/${form.id}/responses`}>
                    Respostas
                  </Link>
                </Button>
                {form.is_published && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/f/${form.slug}`} target="_blank">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
