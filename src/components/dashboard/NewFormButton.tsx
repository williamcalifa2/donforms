"use client";

import { useTransition } from "react";
import { createForm } from "@/app/actions/forms";
import { Plus, SpinnerGap } from "@phosphor-icons/react";

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
        <><SpinnerGap size={16} weight="bold" className="animate-spin" /> Criando…</>
      ) : (
        <><Plus size={16} weight="bold" /> Novo formulário</>
      )}
    </button>
  );
}
