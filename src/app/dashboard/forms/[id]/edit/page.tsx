import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormEditor } from "@/components/editor/FormEditor";
import type { Metadata } from "next";
import type { Form } from "@/types/database.types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("forms")
    .select("title")
    .eq("id", id)
    .single() as { data: { title: string } | null };
  return { title: data?.title ?? "Editor" };
}

export default async function EditFormPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: form, error } = await (supabase as any)
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: Form | null; error: unknown };

  if (error || !form) notFound();

  return <FormEditor form={form as Form} />;
}
