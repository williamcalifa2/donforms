import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSettingsForm } from "./WorkspaceSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("name, email, avatar_url, workspace_name, workspace_logo_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>Personalize seu workspace</p>
      </div>
      <WorkspaceSettingsForm profile={profile} />
    </div>
  );
}
