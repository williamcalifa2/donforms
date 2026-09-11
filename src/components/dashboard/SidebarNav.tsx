"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "Formulários",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline MQL",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className="h-4 w-4">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Configurações",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className="h-4 w-4">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV.map(({ href, label, icon }) => {
        const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group"
            style={{
              color: active ? "hsl(238 100% 74%)" : "var(--sidebar-text)",
              background: active ? "var(--sidebar-active)" : "transparent",
              fontWeight: active ? 600 : 500,
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.background = "var(--sidebar-hover)";
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="shrink-0" style={{ color: "inherit" }}>{icon}</span>
            <span style={{ color: "inherit" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
