import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SidebarUserMenu } from "@/components/dashboard/SidebarUserMenu";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
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
  const workspaceName = profile?.workspace_name ?? "DonForms";
  const workspaceLogo = profile?.workspace_logo_url ?? null;
  const initials = displayName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

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
        {/* Workspace */}
        <Link
          href="/dashboard"
          className="px-4 h-14 flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-75"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {workspaceLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspaceLogo} alt={workspaceName}
              className="h-7 w-7 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/>
              </svg>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-700 leading-tight truncate"
              style={{ color: "var(--sidebar-text-active)", fontWeight: 700 }}>
              {workspaceName}
            </span>
            <span className="text-[10px] leading-tight"
              style={{ color: "var(--text-tertiary)" }}>
              Workspace
            </span>
          </div>
        </Link>

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
