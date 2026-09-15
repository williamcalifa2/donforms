"use client";

import { useState, useTransition } from "react";
import type { WorkspaceInvitation, WorkspacePermissions } from "@/types/database.types";
import type { WorkspaceRole } from "@/lib/workspace/permissions";
import { ROLE_PRESETS } from "@/lib/workspace/permissions";

interface MemberRow {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  email: string;
  avatar_url: string | null;
  permissions: WorkspacePermissions | null;
}

interface Props {
  members: MemberRow[];
  invitations: WorkspaceInvitation[];
  ownerId: string;
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  ownerProfile: { name: string; email: string; avatar_url: string | null };
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", member: "Membro", viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
  admin:  { bg: "rgba(168,85,247,0.12)",  text: "#c084fc" },
  member: { bg: "rgba(99,102,241,0.12)",  text: "#818cf8" },
  viewer: { bg: "rgba(148,163,184,0.1)",  text: "#94a3b8" },
};

const PERM_GROUPS: { label: string; perms: { key: keyof WorkspacePermissions; label: string }[] }[] = [
  {
    label: "Formulários",
    perms: [
      { key: "forms_view",    label: "Ver formulários" },
      { key: "forms_create",  label: "Criar formulários" },
      { key: "forms_edit",    label: "Editar formulários" },
      { key: "forms_publish", label: "Publicar / despublicar" },
      { key: "forms_delete",  label: "Deletar formulários" },
    ],
  },
  {
    label: "Respostas",
    perms: [
      { key: "responses_view",   label: "Ver respostas" },
      { key: "responses_export", label: "Exportar CSV" },
    ],
  },
  {
    label: "Analytics",
    perms: [
      { key: "analytics_view", label: "Ver analytics" },
    ],
  },
  {
    label: "Equipe",
    perms: [
      { key: "team_manage", label: "Gerenciar membros" },
    ],
  },
];

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? ROLE_COLORS.viewer;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size < 36 ? 11 : 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Permission editor for a single member ────────────────────────────────────
function PermissionEditor({
  member,
  canSetAdmin,
  onClose,
  onUpdated,
}: {
  member: MemberRow;
  canSetAdmin: boolean;
  onClose: () => void;
  onUpdated: (updated: Partial<MemberRow>) => void;
}) {
  const rolePreset = ROLE_PRESETS[member.role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
  const initial: WorkspacePermissions = member.permissions
    ? { ...rolePreset, ...member.permissions }
    : rolePreset;

  const [perms, setPerms] = useState<WorkspacePermissions>(initial);
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof WorkspacePermissions) {
    setPerms(p => ({ ...p, [key]: !p[key] }));
  }

  function applyPreset(role: string) {
    setSelectedRole(role);
    const preset = ROLE_PRESETS[role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
    setPerms(preset);
  }

  function isCustom() {
    const preset = ROLE_PRESETS[selectedRole as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
    return (Object.keys(perms) as (keyof WorkspacePermissions)[]).some(k => perms[k] !== preset[k]);
  }

  async function save() {
    setSaving(true);
    setError(null);

    // If role changed, update role first
    if (selectedRole !== member.role) {
      const res = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erro ao alterar role.");
        setSaving(false);
        return;
      }
    }

    // Save custom permissions (or null to reset to preset)
    const customPerms = isCustom() ? perms : null;
    const res2 = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: customPerms }),
    });
    if (!res2.ok) {
      const d = await res2.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar permissões.");
      setSaving(false);
      return;
    }

    onUpdated({ role: selectedRole, permissions: customPerms });
    setSaving(false);
    onClose();
  }

  const labelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
    padding: "7px 0", userSelect: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "28px 28px 24px",
        width: "100%", maxWidth: 460,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={member.name || member.email} avatarUrl={member.avatar_url} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.9)" }}>
                {member.name || member.email.split("@")[0]}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{member.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Nível de acesso
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {(canSetAdmin ? ["viewer", "member", "admin"] : ["viewer", "member"]).map(r => (
              <button
                key={r}
                onClick={() => applyPreset(r)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: "1px solid",
                  background: selectedRole === r ? ROLE_COLORS[r]?.bg : "transparent",
                  color: selectedRole === r ? ROLE_COLORS[r]?.text : "rgba(255,255,255,0.35)",
                  borderColor: selectedRole === r ? (ROLE_COLORS[r]?.text + "40") : "rgba(255,255,255,0.08)",
                  transition: "all 0.12s",
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
            Mudar o nível aplica as permissões padrão. Ajuste cada item abaixo se precisar.
          </p>
        </div>

        {/* Permission checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {PERM_GROUPS.map(group => (
            <div key={group.label}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                {group.label}
              </p>
              {group.perms.map(({ key, label }) => (
                <label key={key} style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={perms[key]}
                    onChange={() => toggle(key)}
                    style={{ width: 15, height: 15, accentColor: "#9ea8ff", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: perms[key] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

        {isCustom() && (
          <div style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 7, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 11, color: "#fbbf24" }}>
            ⚡ Customizado — diferente do padrão desse nível
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>⚠ {error}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 9, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{
            padding: "9px 20px", borderRadius: 9,
            background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
            border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Salvando…" : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TeamSettings({
  members,
  invitations: initialInvitations,
  ownerId,
  currentUserId,
  currentUserRole,
  ownerProfile,
}: Props) {
  const [memberList, setMemberList]       = useState(members);
  const [invitations, setInvitations]     = useState(initialInvitations);
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteRole, setInviteRole]       = useState<"admin" | "member" | "viewer">("member");
  const [inviteToken, setInviteToken]     = useState("");
  const [inviteError, setInviteError]     = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [sentToken, setSentToken]         = useState<string | null>(null);
  const [emailSent, setEmailSent]         = useState<boolean | null>(null);
  const [emailErrMsg, setEmailErrMsg]     = useState<string | null>(null);
  const [tokenCopied, setTokenCopied]     = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const isCurrentUserOwner = currentUserId === ownerId;

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    setSentToken(null);
    setEmailSent(null);
    setEmailErrMsg(null);
    setTokenCopied(false);
    const emailBeingSent = inviteEmail;
    const tokenBeingSent = inviteToken.trim();
    startTransition(async () => {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailBeingSent, role: inviteRole, accessToken: tokenBeingSent || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Erro ao enviar convite."); return; }
      setInviteSuccess(true);
      setSentToken(data.accessToken ?? null);
      setEmailSent(data.emailSent ?? false);
      setEmailErrMsg(data.emailError ?? null);
      setInviteEmail("");
      setInviteToken("");
      setInvitations(prev => [...prev, {
        id: crypto.randomUUID(),
        workspace_id: ownerId,
        email: emailBeingSent.toLowerCase(),
        role: inviteRole,
        token: "",
        invited_by: ownerId,
        expires_at: "2099-12-31T23:59:59Z",
        accepted_at: null,
        created_at: new Date().toISOString(),
      }]);
    });
  }

  async function copyToken() {
    if (!sentToken) return;
    await navigator.clipboard.writeText(sentToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2500);
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/workspace/members/${userId}`, { method: "DELETE" });
    if (res.ok) setMemberList(prev => prev.filter(m => m.user_id !== userId));
  }

  async function revokeInvitation(id: string) {
    const res = await fetch(`/api/workspace/invitations/${id}`, { method: "DELETE" });
    if (res.ok) setInvitations(prev => prev.filter(inv => inv.id !== id));
  }

  function handleMemberUpdated(userId: string, updated: Partial<MemberRow>) {
    setMemberList(prev => prev.map(m => m.user_id === userId ? { ...m, ...updated } : m));
  }

  const cellStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    verticalAlign: "middle",
  };

  const pendingInvites = invitations.filter(inv => !inv.accepted_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Permission editor modal */}
      {editingMember && (
        <PermissionEditor
          member={editingMember}
          canSetAdmin={isCurrentUserOwner}
          onClose={() => setEditingMember(null)}
          onUpdated={updated => { handleMemberUpdated(editingMember.user_id, updated); setEditingMember(null); }}
        />
      )}

      {/* Read-only notice */}
      {!canManage && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(158,168,255,0.06)", border: "1px solid rgba(158,168,255,0.15)", fontSize: 12, color: "rgba(158,168,255,0.7)" }}>
          Você entrou com acesso de <strong style={{ color: "#9ea8ff" }}>{ROLE_LABELS[currentUserRole]}</strong>. Só admins e o dono do workspace gerenciam a equipe.
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>Adicionar alguém</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
            A pessoa recebe o código no e-mail e entra pelo <strong style={{ color: "rgba(255,255,255,0.5)" }}>/acesso</strong>.
          </p>

          <form onSubmit={sendInvite} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="email"
                placeholder="email@empresa.com"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(false); }}
                required
                style={{ flex: "1 1 220px", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="viewer">Visualizador</option>
                <option value="member">Membro</option>
                {isCurrentUserOwner && <option value="admin">Admin</option>}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" placeholder="000000"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                style={{ width: 120, flexShrink: 0, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(158,168,255,0.2)", color: "var(--accent-c)", fontSize: 20, outline: "none", fontFamily: "monospace", letterSpacing: "0.15em", textAlign: "center" }}
              />
              <button type="button" onClick={() => setInviteToken(String(Math.floor(100000 + Math.random() * 900000)))}
                style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(158,168,255,0.08)", border: "1px solid rgba(158,168,255,0.15)", color: "var(--accent-c)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                Gerar
              </button>
              <button type="submit" disabled={isPending || !inviteEmail || inviteToken.length !== 6}
                style={{ flex: 1, padding: "10px 20px", borderRadius: 10, background: "var(--accent-c)", color: "hsl(230 35% 7%)", fontSize: 13, fontWeight: 700, border: "none", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending || inviteToken.length !== 6 ? 0.5 : 1, fontFamily: "inherit", transition: "opacity 0.15s", whiteSpace: "nowrap" }}>
                {isPending ? "Enviando…" : "Enviar convite"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>
              Use &quot;Gerar&quot; pra criar um código aleatório. Permissões podem ser ajustadas depois.
            </p>
          </form>

          {inviteError && <p style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>⚠ {inviteError}</p>}

          {inviteSuccess && sentToken && (
            <div style={{ marginTop: 12, padding: "16px", borderRadius: 12, background: "rgba(158,168,255,0.06)", border: "1px solid rgba(158,168,255,0.2)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--accent-c)", fontWeight: 600 }}>✓ Convite criado</span>
                {emailSent === true && <span style={{ fontSize: 11, color: "rgba(158,168,255,0.6)" }}>· enviado por email</span>}
                {emailSent === false && <span style={{ fontSize: 11, color: "#fbbf24" }}>· email não enviado</span>}
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(158,168,255,0.15)" }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Código de acesso</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "var(--accent-c)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{sentToken}</code>
                  <button onClick={copyToken} style={{ padding: "5px 12px", borderRadius: 8, background: tokenCopied ? "rgba(52,211,153,0.15)" : "rgba(158,168,255,0.12)", border: `1px solid ${tokenCopied ? "rgba(52,211,153,0.3)" : "rgba(158,168,255,0.2)"}`, color: tokenCopied ? "#34d399" : "var(--accent-c)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {tokenCopied ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
              </div>
              {emailSent === false && emailErrMsg && (
                <p style={{ fontSize: 11, color: "rgba(251,191,36,0.7)", margin: 0 }}>
                  ⚠ {emailErrMsg.includes("RESEND_API_KEY") ? "Configure RESEND_API_KEY para envio automático." : `Erro: ${emailErrMsg}`}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Members table */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
          Membros · {memberList.length + 1}
        </h2>

        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Owner row */}
              <tr>
                <td style={cellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={ownerProfile.name || ownerProfile.email} avatarUrl={ownerProfile.avatar_url} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                        {ownerProfile.name || ownerProfile.email.split("@")[0]}
                        {isCurrentUserOwner && <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>(você)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{ownerProfile.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellStyle, width: 110 }}><RoleBadge role="owner" /></td>
                <td style={{ ...cellStyle, width: 120, textAlign: "right" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Acesso total</span>
                </td>
                <td style={{ ...cellStyle, width: 50 }} />
              </tr>

              {/* Other members */}
              {memberList.map(m => {
                const isSelf = m.user_id === currentUserId;
                const hasCustomPerms = m.permissions !== null;
                const canEdit = canManage && !isSelf && !(currentUserRole === "admin" && m.role === "admin");
                return (
                  <tr key={m.user_id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={m.name || m.email} avatarUrl={m.avatar_url} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                            {m.name || m.email.split("@")[0]}
                            {isSelf && <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>(você)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...cellStyle, width: 110 }}>
                      <RoleBadge role={m.role} />
                    </td>
                    <td style={{ ...cellStyle, width: 120, textAlign: "right" }}>
                      {canEdit ? (
                        <button
                          onClick={() => setEditingMember(m)}
                          style={{ padding: "5px 12px", borderRadius: 8, background: hasCustomPerms ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${hasCustomPerms ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)"}`, color: hasCustomPerms ? "#fbbf24" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                        >
                          {hasCustomPerms ? "⚡ Custom" : "Permissões"}
                        </button>
                      ) : hasCustomPerms ? (
                        <span style={{ fontSize: 11, color: "#fbbf24" }}>⚡ Custom</span>
                      ) : null}
                    </td>
                    <td style={{ ...cellStyle, width: 50, textAlign: "right" }}>
                      {canEdit && (
                        <button onClick={() => removeMember(m.user_id)} title="Remover membro"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "4px 6px", borderRadius: 6, fontSize: 16, lineHeight: 1, transition: "color 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)"; }}>
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {memberList.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              {canManage ? "Nenhum membro ainda. Envie um convite acima." : "Nenhum outro membro neste workspace."}
            </div>
          )}
        </div>
      </section>

      {/* Pending invitations */}
      {canManage && pendingInvites.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
            Convites pendentes · {pendingInvites.length}
          </h2>
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {pendingInvites.map(inv => (
                  <tr key={inv.id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>?</div>
                        <div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{inv.email}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                            {inv.expires_at.startsWith("2099") ? "Token permanente" : `Expira em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...cellStyle, width: 110 }}><RoleBadge role={inv.role} /></td>
                    <td style={{ ...cellStyle, width: 120 }} />
                    <td style={{ ...cellStyle, width: 50, textAlign: "right" }}>
                      <button onClick={() => revokeInvitation(inv.id)} title="Cancelar convite"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "4px 6px", borderRadius: 6, fontSize: 16, lineHeight: 1, transition: "color 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)"; }}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Role legend */}
      <section style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
          <strong style={{ color: "#fbbf24" }}>Owner</strong> — tudo, sempre, imutável.{" "}
          <strong style={{ color: "#c084fc" }}>Admin</strong> — tudo + gerencia a equipe.{" "}
          <strong style={{ color: "#818cf8" }}>Membro</strong> — cria, edita e publica.{" "}
          <strong style={{ color: "#94a3b8" }}>Visualizador</strong> — só lê.{" "}
          <strong style={{ color: "#fbbf24" }}>⚡ Custom</strong> — permissões ajustadas manualmente.
        </p>
      </section>
    </div>
  );
}
