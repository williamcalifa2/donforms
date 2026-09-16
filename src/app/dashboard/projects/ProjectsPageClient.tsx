"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, SpinnerGap } from "@phosphor-icons/react";

export function ProjectsPageClient() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar projeto");
      }

      setName("");
      setOpen(false);
      router.push(`/dashboard/projects/${data.project.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar projeto";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "var(--accent-c)", color: "#fff" }}
      >
        <Plus size={15} weight="bold" /> Novo Projeto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => {
            if (!loading && e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Screen loader overlay while saving */}
            {loading && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
                style={{ background: "rgba(0, 0, 0, 0.75)" }}
              >
                <SpinnerGap
                  size={36}
                  weight="bold"
                  className="animate-spin"
                  style={{ color: "var(--accent-c)" }}
                />
                <p className="text-sm font-medium text-white">Salvando projeto...</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Novo Projeto</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente / projeto"
                required
                disabled={loading}
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                style={{ borderColor: "var(--border)" }}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--accent-c)", color: "#fff" }}
              >
                {loading ? (
                  <>
                    <SpinnerGap size={16} weight="bold" className="animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Projeto"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
