import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SidebarUserMenu } from "@/components/dashboard/SidebarUserMenu";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import type { Metadata } from "next";
import type { Profile } from "@/types/database.types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Tenta buscar com colunas de workspace; fallback se não existirem
  let profile: (Pick<Profile, "name" | "email" | "avatar_url"> & {
    workspace_name?: string | null;
    workspace_logo_url?: string | null;
  }) | null = null;

  try {
    const { data } = await client
      .from("profiles")
      .select("name, email, avatar_url, workspace_name, workspace_logo_url")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    // Fallback sem colunas de workspace
    const { data } = await client
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "Usuário";
  const email = profile?.email ?? user.email ?? "";
  const ownWorkspaceName = profile?.workspace_name ?? "DonForms";
  const ownWorkspaceLogo = profile?.workspace_logo_url ?? null;
  const initials = displayName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  // ── Workspace memberships (for switcher) ───────────────────
  const { data: memberships } = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  // Fetch owner profiles for each workspace the user is a member of
  type WsOption = { id: string; name: string; logoUrl: string | null; role: string | null };
  const memberWorkspaces: WsOption[] = await Promise.all(
    (memberships ?? []).map(async (m: { workspace_id: string; role: string }) => {
      const { data: ownerProf } = await client
        .from("profiles")
        .select("name, workspace_name, workspace_logo_url")
        .eq("id", m.workspace_id)
        .single();
      return {
        id: m.workspace_id,
        name: ownerProf?.workspace_name ?? ownerProf?.name ?? "Workspace",
        logoUrl: ownerProf?.workspace_logo_url ?? null,
        role: m.role,
      };
    })
  );

  const ownOption: WsOption = { id: user.id, name: ownWorkspaceName, logoUrl: ownWorkspaceLogo, role: null };
  const allWorkspaces: WsOption[] = [ownOption, ...memberWorkspaces];

  // Determine active workspace from cookie
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value ?? user.id;
  const activeWs = allWorkspaces.find(w => w.id === wid) ?? ownOption;

  const workspaceName = activeWs.name;
  const workspaceLogo = activeWs.logoUrl;

  return (
    <div className="dark flex min-h-screen text-foreground bg-background">
      {/* ── Sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col"
        style={{
          width: "var(--sidebar-width)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Workspace switcher */}
        <div
          className="px-4 h-14 flex items-center shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <WorkspaceSwitcher current={activeWs} options={allWorkspaces} />
        </div>

        {/* Nav */}
        <SidebarNav />

        {/* User */}
        <div style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <SidebarUserMenu
            displayName={displayName}
            email={email}
            initials={initials}
            avatarUrl={profile?.avatar_url ?? null}
            workspaceName={workspaceName}
            workspaceLogoUrl={workspaceLogo}
          />
        </div>
      </aside>

      {/* ── Main ── */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{
          marginLeft: "var(--sidebar-width)",
          background: "var(--main-bg)",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      >
        <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
