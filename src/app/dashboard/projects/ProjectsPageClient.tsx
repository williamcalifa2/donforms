"use client";

import { useActionState, useRef, useState } from "react";
import { createProject } from "@/app/actions/projects";
import { Plus, X } from "@phosphor-icons/react";

const initialState = { error: null as string | null };

export function ProjectsPageClient() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProject, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "var(--accent-c)", color: "#fff" }}>
        <Plus size={15} weight="bold" /> Novo Projeto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Novo Projeto</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <form ref={formRef} action={action} className="space-y-3">
              <input
                name="name"
                placeholder="Nome do cliente / projeto"
                required
                className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ borderColor: "var(--border)" }}
              />
              {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
              <button type="submit" disabled={pending}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "var(--accent-c)", color: "#fff" }}>
                {pending ? "Criando..." : "Criar Projeto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
