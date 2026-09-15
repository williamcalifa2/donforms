import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portal do Cliente" };

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#06060e",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "rgba(255,255,255,0.88)",
    }}>
      {children}
    </div>
  );
}
