export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormEditor } from "@/components/editor/FormEditor";
import { saveFormAsClient, togglePublishAsClient, deleteFormAsClient } from "@/app/actions/projects";
import type { Form } from "@/types/database.types";

interface Props {
  params: Promise<{ token: string; formId: string }>;
}

export default async function ClientFormEditPage({ params }: Props) {
  const { token, formId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Verify token → project → form ownership
  const { data: clientRow } = await admin
    .from("project_clients")
    .select("project_id")
    .eq("token", token)
    .single();

  if (!clientRow) notFound();

  const { data: form } = await admin
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("project_id", clientRow.project_id)
    .single();

  if (!form) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

  // Bind token into the actions so FormEditor can call them without knowing the token
  const boundSave = saveFormAsClient.bind(null, token);
  const boundToggle = togglePublishAsClient.bind(null, token);
  const boundDelete = deleteFormAsClient.bind(null, token);

  return (
    <FormEditor
      form={form as Form}
      appUrl={appUrl}
      backHref={`/c/${token}`}
      disableDelete
      responsesHref={`/c/${token}/forms/${formId}`}
      analyticsHref={`/c/${token}/forms/${formId}/analytics`}
      saveFormFn={boundSave}
      togglePublishFn={boundToggle}
      deleteFormFn={boundDelete}
    />
  );
}
