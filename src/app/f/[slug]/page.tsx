import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPlayer } from "@/components/player/FormPlayer";
import type { Metadata } from "next";
import type { Form } from "@/types/database.types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("forms")
    .select("title")
    .eq("slug", slug)
    .eq("is_published", true)
    .single() as { data: { title: string } | null };

  return {
    title: data?.title ?? "Formulário",
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: form, error } = await (supabase as any)
    .from("forms")
    .select("id, title, slug, settings, fields, user_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .single() as { data: (Pick<Form, "id" | "title" | "slug" | "settings" | "fields"> & { user_id: string }) | null; error: unknown };

  if (error || !form) notFound();

  // Fetch workspace logo from owner's profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("workspace_logo_url")
    .eq("id", form!.user_id)
    .single() as { data: { workspace_logo_url: string | null } | null };

  const settings = {
    ...form!.settings,
    logoUrl: form!.settings.logoUrl ?? profile?.workspace_logo_url ?? null,
  };

  // Check access control: maxResponses
  if (form!.settings.maxResponses) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form!.id) as { count: number | null };

    if ((count ?? 0) >= form!.settings.maxResponses) {
      return <FormClosed title={form!.title} reason="limit" />;
    }
  }

  // Check access control: closeAt
  if (form!.settings.closeAt && new Date(form!.settings.closeAt) < new Date()) {
    return <FormClosed title={form!.title} reason="date" />;
  }

  // Form sem perguntas: mostrar mensagem ao invés de 404
  const fields = form!.fields.length > 0
    ? form!.fields
    : [{
        id: "empty",
        type: "statement" as const,
        label: "Este formulário ainda não tem perguntas",
        description: "O criador ainda está configurando este formulário. Volte em breve.",
        required: false,
      }];

  return (
    <FormPlayer
      formId={form!.id}
      title={form!.title}
      fields={fields}
      settings={settings}
    />
  );
}

function FormClosed({ title, reason }: { title: string; reason: "limit" | "date" }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "#f9f9f9" }}
    >
      <div className="max-w-md space-y-4">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm">
          {reason === "limit"
            ? "Este formulário atingiu o número máximo de respostas e não está mais aceitando novas submissões."
            : "Este formulário foi encerrado e não está mais aceitando novas respostas."}
        </p>
        <p className="text-xs text-gray-400 pt-2">
          Feito com <span className="font-medium text-gray-600">DonForms</span>
        </p>
      </div>
    </div>
  );
}
