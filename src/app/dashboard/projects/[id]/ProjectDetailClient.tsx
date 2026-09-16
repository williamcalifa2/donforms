"use client";

import { useActionState, useState } from "react";
import { inviteProjectClient, removeProjectClient, createProjectForm } from "@/app/actions/projects";
import { Plus, Copy, Check, Trash, UserPlus, GearSix, X } from "@phosphor-icons/react";

// ── New Form Button ────────────────────────────────────────────────────────
export function NewFormButton({ projectId }: { projectId: string }) {
  const action = createProjectForm.bind(null, projectId);
  return (
    <form action={action}>
      <button type="submit"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: "var(--accent-c)", color: "#fff" }}>
        <Plus size={13} weight="bold" /> Novo Form
      </button>
    </form>
  );
}

// ── Copy Link Button ───────────────────────────────────────────────────────
function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors hover:bg-accent"
      title="Copiar link">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}

// ── Remove Client ──────────────────────────────────────────────────────────
function RemoveClientButton({ clientId, projectId }: { clientId: string; projectId: string }) {
  const handleRemove = async () => {
    await removeProjectClient(clientId, projectId);
  };
  return (
    <form action={handleRemove}>
      <button type="submit" title="Remover acesso"
        className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
        <Trash size={13} />
      </button>
    </form>
  );
}

// ── Invite Form ────────────────────────────────────────────────────────────
type InviteState = { error: string | null; token: string | null };
const initialInviteState: InviteState = { error: null, token: null };

function InviteForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteProjectClient, initialInviteState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
        style={{
          color: "var(--accent-c)",
          borderColor: "var(--accent-c)",
          background: "var(--accent-soft)",
        }}>
        <UserPlus size={13} /> Convidar cliente
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex gap-2 flex-wrap">
        <input name="client_name" placeholder="Nome do cliente" required
          className="px-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 flex-1"
          style={{ borderColor: "var(--border)", minWidth: 130 }} />
        <input name="client_email" type="email" placeholder="Email (opcional)"
          className="px-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 flex-1"
          style={{ borderColor: "var(--border)", minWidth: 160 }} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--accent-c)", color: "#fff" }}>
          {pending ? "..." : "Gerar link"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

// ── Settings Modal ─────────────────────────────────────────────────────────
interface Client {
  id: string; client_name: string; client_email: string; token: string; created_at: string;
}

interface SettingsModalProps {
  projectId: string;
  clients: Client[];
  appUrl: string;
  onClose: () => void;
}

function ProjectSettingsModal({ projectId, clients, appUrl, onClose }: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Configurações do projeto</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Clientes com acesso ao portal deste projeto
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <InviteForm projectId={projectId} />

          {clients.length === 0 ? (
            <div className="rounded-xl py-8 text-center" style={{ border: "1px dashed var(--card-border)" }}>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Nenhum cliente convidado ainda</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--card-border)" }}>
              {clients.map((c, i) => (
                <div key={c.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--card-border)" : undefined }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}>
                    {c.client_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.client_name}</p>
                    {c.client_email && <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>{c.client_email}</p>}
                  </div>
                  <CopyButton url={`${appUrl}/c/${c.token}`} />
                  <RemoveClientButton clientId={c.id} projectId={projectId} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Settings Button (exported) ─────────────────────────────────────────────
interface SettingsButtonProps {
  projectId: string;
  clients: Client[];
  appUrl: string;
}

export function ProjectSettingsButton({ projectId, clients, appUrl }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
        style={{ color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
        title="Configurações do projeto"
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <GearSix size={15} weight="duotone" />
      </button>
      {open && (
        <ProjectSettingsModal
          projectId={projectId}
          clients={clients}
          appUrl={appUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
