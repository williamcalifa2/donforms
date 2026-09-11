"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const name = String(formData.get("name") ?? "").trim();
  const avatarFile = formData.get("avatar") as File | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  let avatar_url: string | undefined;

  // Upload foto se fornecida
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await client.storage
      .from("form-assets")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (!uploadError) {
      const { data: urlData } = client.storage
        .from("form-assets")
        .getPublicUrl(path);
      avatar_url = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : undefined;
    }
  }

  const update: Record<string, string> = {};
  if (name) update.name = name;
  if (avatar_url) update.avatar_url = avatar_url;

  if (Object.keys(update).length > 0) {
    await client.from("profiles").update(update).eq("id", user.id);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
