import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPlayer } from "@/components/player/FormPlayer";
import type { Form } from "@/types/database.types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: form, error } = await (supabase as any)
    .from("forms")
    .select("id, title, slug, settings, fields")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: Pick<Form, "id" | "title" | "slug" | "settings" | "fields"> | null; error: unknown };

  if (error || !form) notFound();

  return (
    <div className="relative">
      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-xs font-medium text-center py-1.5 flex items-center justify-center gap-2">
        <span>👁 Modo preview — respostas não serão salvas</span>
        <a
          href={`/dashboard/forms/${id}/edit`}
          className="underline hover:no-underline"
        >Voltar ao editor</a>
      </div>
      <div className="pt-8">
        <FormPlayer
          formId={form.id}
          title={form.title}
          fields={form.fields.length > 0 ? form.fields : [{
            id: "placeholder",
            type: "statement",
            label: "Este formulário não tem perguntas ainda",
            description: "Adicione perguntas no editor para visualizar o formulário.",
            required: false,
          }]}
          settings={form.settings}
          preview
        />
      </div>
    </div>
  );
}
