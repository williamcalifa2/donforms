export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";
import { TeamSettings } from "@/components/dashboard/TeamSettings";
import type { Metadata } from "next";
import type { WorkspaceInvitation } from "@/types/database.types";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { ownerId, isOwner, role } = await resolveWorkspaceContext(user.id);

  // Use admin client — bypass RLS for cross-workspace reads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // ── Workspace owner profile ─────────────────────────────────────────────
  let ownerProfile: { name: string; email: string; avatar_url: string | null } = {
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Dono",
    email: user.email ?? "",
    avatar_url: null,
  };

  if (!isOwner) {
    const { data: op } = await admin
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("id", ownerId)
      .single();
    if (op) ownerProfile = op;
  } else {
    // Fetch own profile for accurate name/avatar
    const { data: op } = await admin
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("id", user.id)
      .single();
    if (op) ownerProfile = op;
  }

  // ── Workspace members (everyone except the owner) ──────────────────────
  const { data: rawMembers } = await admin
    .from("workspace_members")
    .select("workspace_id, user_id, role, joined_at")
    .eq("workspace_id", ownerId);

  const memberList = rawMembers ?? [];

  type MemberRow = {
    workspace_id: string; user_id: string; role: string;
    joined_at: string; name: string; email: string; avatar_url: string | null;
  };

  const members: MemberRow[] = await Promise.all(
    memberList.map(async (m: { workspace_id: string; user_id: string; role: string; joined_at: string }) => {
      const { data: prof } = await admin
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

  // ── Pending invitations ────────────────────────────────────────────────
  // Filter: expires_at that is NOT the permanent sentinel (2099) and is in the past → expired
  // We show all non-accepted (permanent tokens show as pending until accepted)
  const { data: rawInvitations } = await admin
    .from("workspace_invitations")
    .select("*")
    .eq("workspace_id", ownerId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  // Filter out truly expired (non-2099) invites
  const now = new Date();
  const invitations: WorkspaceInvitation[] = (rawInvitations ?? []).filter((inv: WorkspaceInvitation) => {
    if (!inv.expires_at) return true;
    if (inv.expires_at.startsWith("2099")) return true;
    return new Date(inv.expires_at) > now;
  });

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
        ownerId={ownerId}
        currentUserId={user.id}
        currentUserRole={role}
        ownerProfile={ownerProfile}
      />
    </div>
  );
}
