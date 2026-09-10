import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormPlayer } from "@/components/player/FormPlayer";
import type { Metadata } from "next";
import type { Form } from "@/types/database.types";

interface Props {
  params: Promise<{ slug: string }>;
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
    // Sem indexação — respostas privadas
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: form, error } = await (supabase as any)
    .from("forms")
    .select("id, title, slug, settings, fields")
    .eq("slug", slug)
    .eq("is_published", true)
    .single() as { data: Pick<Form, "id" | "title" | "slug" | "settings" | "fields"> | null; error: unknown };

  if (error || !form || form.fields.length === 0) notFound();

  return (
    <FormPlayer
      formId={form.id}
      title={form.title}
      fields={form.fields}
      settings={form.settings}
    />
  );
}
