"use client";

import { useActionState, useState } from "react";
import { inviteProjectClient, removeProjectClient, createProjectForm } from "@/app/actions/projects";
import { Plus, Copy, Check, Trash, UserPlus } from "@phosphor-icons/react";

// ── New Form Button ────────────────────────────────────────────────────────
function NewFormButton({ projectId }: { projectId: string }) {
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-accent"
        style={{ color: "var(--accent-c)", borderColor: "var(--accent-c)" }}>
        <UserPlus size={13} /> Convidar cliente
      </button>
    );
  }

  return (
    <form action={action} className="flex gap-2 flex-wrap">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="client_name" placeholder="Nome do cliente" required
        className="px-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
        style={{ borderColor: "var(--border)", minWidth: 150 }} />
      <input name="client_email" type="email" placeholder="Email (opcional)"
        className="px-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
        style={{ borderColor: "var(--border)", minWidth: 180 }} />
      <button type="submit" disabled={pending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{ background: "var(--accent-c)", color: "#fff" }}>
        {pending ? "..." : "Gerar link"}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
        Cancelar
      </button>
      {state?.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
interface Client {
  id: string; client_name: string; client_email: string; token: string; created_at: string;
}

interface Props {
  projectId: string;
  clients: Client[];
  appUrl: string;
}

function ProjectDetailClientRoot({ projectId, clients, appUrl }: Props) {
  return (
    <div className="space-y-3">
      <InviteForm projectId={projectId} />

      {clients.length === 0 ? (
        <div className="border rounded-xl py-8 text-center text-muted-foreground">
          <p className="text-sm">Nenhum cliente convidado ainda</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          {clients.map((c, i) => (
            <div key={c.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}>
                {c.client_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.client_name}</p>
                {c.client_email && <p className="text-xs text-muted-foreground truncate">{c.client_email}</p>}
              </div>
              <CopyButton url={`${appUrl}/c/${c.token}`} />
              <RemoveClientButton clientId={c.id} projectId={projectId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Static namespace for NewFormButton export
ProjectDetailClientRoot.NewFormButton = NewFormButton;
export const ProjectDetailClient = ProjectDetailClientRoot;
