"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const workspace_name = String(formData.get("workspace_name") ?? "").trim() || null;
  const logoFile = formData.get("workspace_logo") as File | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  let workspace_logo_url: string | undefined;

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop() ?? "png";
    const path = `${user.id}/workspace-logo.${ext}`;
    const { error: uploadError } = await client.storage
      .from("form-assets")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });

    if (!uploadError) {
      const { data: urlData } = client.storage.from("form-assets").getPublicUrl(path);
      workspace_logo_url = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : undefined;
    }
  }

  const update: Record<string, string | null> = {};
  if (workspace_name !== undefined) update.workspace_name = workspace_name;
  if (workspace_logo_url) update.workspace_logo_url = workspace_logo_url;

  if (Object.keys(update).length > 0) {
    await client.from("profiles").update(update).eq("id", user.id);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
