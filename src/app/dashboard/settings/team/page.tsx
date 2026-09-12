export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamSettings } from "@/components/dashboard/TeamSettings";
import type { Metadata } from "next";
import type { WorkspaceInvitation } from "@/types/database.types";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Fetch workspace members
  const { data: rawMembers } = await client
    .from("workspace_members")
    .select("workspace_id, user_id, role, joined_at, invited_by")
    .eq("workspace_id", user.id);

  const memberList = rawMembers ?? [];

  // Fetch profiles for each member
  type MemberRow = {
    workspace_id: string; user_id: string; role: string;
    joined_at: string; name: string; email: string; avatar_url: string | null;
  };
  const members: MemberRow[] = await Promise.all(
    memberList.map(async (m: { workspace_id: string; user_id: string; role: string; joined_at: string }) => {
      const { data: prof } = await client
        .from("profiles")
        .select("name, email, avatar_url")
        .eq("id", m.user_id)
        .single();
      return {
        ...m,
        name: prof?.name ?? "",
        email: prof?.email ?? "",
        avatar_url: prof?.avatar_url ?? null,
      };
    })
  );

  // Fetch pending invitations
  const { data: rawInvitations } = await client
    .from("workspace_invitations")
    .select("*")
    .eq("workspace_id", user.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const invitations: WorkspaceInvitation[] = rawInvitations ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Equipe</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          Gerencie os membros do seu workspace
        </p>
      </div>
      <TeamSettings
        members={members}
        invitations={invitations}
        ownerId={user.id}
      />
    </div>
  );
}
