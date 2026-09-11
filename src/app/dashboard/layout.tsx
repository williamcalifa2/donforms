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
        {/* Workspace logo */}
        <Link href="/dashboard" className="px-4 h-14 flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          {workspaceLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspaceLogo} alt={workspaceName}
              className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-md flex items-center justify-center text-white shrink-0"
              style={{ background: "var(--gradient-primary)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="h-3.5 w-3.5">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
          )}
          <span className="font-semibold text-sm leading-tight truncate"
            style={{ color: "var(--sidebar-text-active)" }}>
            {workspaceName}
          </span>
        </Link>

        {/* Nav */}
        <SidebarNav />

        {/* User menu at bottom */}
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
      <div className="flex-1 flex flex-col min-h-screen"
        style={{ marginLeft: "var(--sidebar-width)", background: "var(--main-bg)" }}>
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
