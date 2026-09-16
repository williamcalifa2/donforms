"use client";

import { useTransition } from "react";
import { createProjectFormAsClient } from "@/app/actions/projects";

export function NewFormClientButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const action = createProjectFormAsClient.bind(null, token);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={isPending}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 10,
          background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
          color: "#fff", border: "none", cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1, transition: "opacity 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
        {isPending ? "Criando..." : "Novo Form"}
      </button>
    </form>
  );
}
