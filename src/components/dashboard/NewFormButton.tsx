"use client";

import { useTransition } from "react";
import { createForm } from "@/app/actions/forms";

export function NewFormButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => createForm())}
      disabled={isPending}
      className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
      style={{ background: "var(--gradient-primary)", color: "#fff", boxShadow: "0 2px 12px hsl(238 100% 74% / 0.25)" }}
      onMouseEnter={e => { if (!isPending) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      {isPending ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Criando…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Novo formulário
        </>
      )}
    </button>
  );
}
