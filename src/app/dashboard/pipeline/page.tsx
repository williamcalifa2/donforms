import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isMqlByField } from "@/lib/score";
import type { Form, Submission } from "@/types/database.types";
import type { Metadata } from "next";
import { PipelineClient, type SubRow, type FormRow } from "./PipelineClient";

export const metadata: Metadata = { title: "Pipeline MQL" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Determine active workspace
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value;
  let activeWorkspaceId = user.id;
  if (wid && wid !== user.id) {
    const { data: membership } = await client
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", wid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) activeWorkspaceId = wid;
  }

  // Fetch forms
  const { data: formsData } = await client
    .from("forms")
    .select("id, title, settings, fields")
    .eq("user_id", activeWorkspaceId) as { data: Form[] | null };

  const forms = formsData ?? [];
  const formIds = forms.map(f => f.id);

  // Fetch submissions (last 90 days max — client can further filter)
  let allSubs: Submission[] = [];
  if (formIds.length > 0) {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data: subsData } = await client
      .from("submissions")
      .select("*")
      .in("form_id", formIds)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }) as { data: Submission[] | null };
    allSubs = subsData ?? [];
  }

  // Build form map
  const formMap = new Map(forms.map(f => [f.id, f]));

  // Serialize SubRow
  const subs: SubRow[] = allSubs.map(sub => {
    const form = formMap.get(sub.form_id);
    const fields = (form?.fields ?? []) as import("@/types/database.types").FormField[];
    const mql = isMqlByField(sub.answers, fields);
    const mqlField = fields.find(f => f.isMqlField);
    const mqlFieldValue = mqlField ? sub.answers[mqlField.id] : undefined;

    // Lead name from form fields
    const nameField = fields.find(f =>
      f.type !== "statement" && /nome|name/i.test(f.label)
    );
    const leadName = nameField ? String(sub.answers[nameField.id] ?? "Lead") : "Lead";

    return {
      id: sub.id,
      form_id: sub.form_id,
      answers: sub.answers,
      metadata: (sub.metadata ?? {}) as SubRow["metadata"],
      created_at: sub.created_at,
      mql,
      mqlFieldValue: mqlFieldValue ?? null,
      formTitle: form?.title ?? "—",
      leadName,
    };
  });

  // Serialize FormRow
  const formRows: FormRow[] = forms.map(form => ({
    id: form.id,
    title: form.title,
    hasConfig: (form.fields as import("@/types/database.types").FormField[]).some(f => f.isMqlField),
  }));

  return <PipelineClient subs={subs} forms={formRows} />;
}
