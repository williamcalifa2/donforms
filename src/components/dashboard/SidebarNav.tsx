"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ChartBar, ChartLineUp, GearSix, UsersThree, PlugsConnected } from "@phosphor-icons/react";

const NAV_MAIN = [
  { href: "/dashboard",                label: "Formulários",   Icon: FileText       },
  { href: "/dashboard/analytics",      label: "Analytics",     Icon: ChartBar       },
  { href: "/dashboard/pipeline",       label: "Pipeline MQL",  Icon: ChartLineUp    },
  { href: "/dashboard/integrations",   label: "Integrações",   Icon: PlugsConnected },
];

const NAV_SETTINGS = [
  { href: "/dashboard/settings/team", label: "Equipe",        Icon: UsersThree },
  { href: "/dashboard/settings",      label: "Configurações", Icon: GearSix    },
];

function NavItem({ href, label, Icon, exact = false }: {
  href: string; label: string;
  Icon: React.ComponentType<{ size?: number; weight?: "duotone" | "regular" }>;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all duration-150 group"
      style={{
        color: active ? "var(--text-primary)" : "var(--sidebar-text)",
        background: active ? "var(--sidebar-active)" : "transparent",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--sidebar-hover)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Active accent bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
          style={{ height: "60%", background: "var(--accent)" }}
        />
      )}
      <span style={{ color: active ? "var(--accent)" : "inherit", flexShrink: 0, lineHeight: 0 }}>
        <Icon size={15} weight={active ? "duotone" : "regular"} />
      </span>
      <span style={{ color: "inherit" }}>{label}</span>
    </Link>
  );
}

export function SidebarNav() {
  return (
    <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-4">
      <div className="space-y-0.5">
        {NAV_MAIN.map(item => <NavItem key={item.href} {...item} />)}
      </div>

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)" }}>
          Conta
        </p>
        <div className="space-y-0.5">
          {NAV_SETTINGS.map(item => <NavItem key={item.href} {...item} />)}
        </div>
      </div>
    </nav>
  );
}
