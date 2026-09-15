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

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner:  { bg: "rgba(251,191,36,0.1)",   text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  admin:  { bg: "rgba(192,132,252,0.1)",  text: "#c084fc", border: "rgba(192,132,252,0.25)" },
  member: { bg: "rgba(129,140,248,0.1)",  text: "#818cf8", border: "rgba(129,140,248,0.25)" },
  viewer: { bg: "rgba(148,163,184,0.08)", text: "#94a3b8", border: "rgba(148,163,184,0.2)" },
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
    perms: [{ key: "analytics_view", label: "Ver analytics" }],
  },
  {
    label: "Equipe",
    perms: [{ key: "team_manage", label: "Gerenciar membros" }],
  },
];

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap",
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#6c63ff 0%,#8b5cf6 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size <= 32 ? 11 : 13, fontWeight: 700, color: "#fff",
      letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

// ─── Permission modal ─────────────────────────────────────────────────────────
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
    setPerms(ROLE_PRESETS[role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer);
  }

  function isCustom() {
    const preset = ROLE_PRESETS[selectedRole as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
    return (Object.keys(perms) as (keyof WorkspacePermissions)[]).some(k => perms[k] !== preset[k]);
  }

  async function save() {
    setSaving(true);
    setError(null);

    if (selectedRole !== member.role) {
      const res = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erro ao alterar nível.");
        setSaving(false);
        return;
      }
    }

    const customPerms = isCustom() ? perms : null;
    const res2 = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: customPerms }),
    });
    if (!res2.ok) {
      const d = await res2.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar.");
      setSaving(false);
      return;
    }

    onUpdated({ role: selectedRole, permissions: customPerms });
    setSaving(false);
    onClose();
  }

  const custom = isCustom();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#0d0d1a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18,
        width: "100%", maxWidth: 440,
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}>

        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={member.name || member.email} avatarUrl={member.avatar_url} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                {member.name || member.email.split("@")[0]}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                {member.email}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 16, cursor: "pointer",
              lineHeight: 1, flexShrink: 0,
            }}
            aria-label="Fechar"
          >×</button>
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Role selector */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
              Nível de acesso
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {(canSetAdmin ? ["viewer", "member", "admin"] : ["viewer", "member"]).map(r => {
                const isSelected = selectedRole === r;
                const c = ROLE_COLORS[r];
                return (
                  <button
                    key={r}
                    onClick={() => applyPreset(r)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.12s",
                      background: isSelected ? c.bg : "rgba(255,255,255,0.03)",
                      color: isSelected ? c.text : "rgba(255,255,255,0.3)",
                      border: `1px solid ${isSelected ? c.border : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permission groups */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PERM_GROUPS.map(group => (
              <div key={group.label}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
                  {group.label}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {group.perms.map(({ key, label }) => {
                    const on = perms[key];
                    return (
                      <label
                        key={key}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                          background: on ? "rgba(158,168,255,0.05)" : "transparent",
                          transition: "background 0.1s",
                        }}
                      >
                        {/* custom toggle */}
                        <span
                          onClick={() => toggle(key)}
                          role="checkbox"
                          aria-checked={on}
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === " " || e.key === "Enter") toggle(key); }}
                          style={{
                            width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: on ? "#818cf8" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${on ? "#818cf8" : "rgba(255,255,255,0.12)"}`,
                            transition: "all 0.12s",
                          }}
                        >
                          {on && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <input type="checkbox" checked={on} onChange={() => toggle(key)} style={{ display: "none" }} />
                        <span style={{ fontSize: 13, color: on ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.3)", transition: "color 0.1s" }}>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom warning */}
          {custom && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: 9,
              background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)",
            }}>
              <span style={{ fontSize: 13 }}>⚡</span>
              <span style={{ fontSize: 12, color: "#fbbf24" }}>Diferente do padrão desse nível</span>
            </div>
          )}

          {error && (
            <div style={{ padding: "9px 12px", borderRadius: 9, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 12, color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "9px 16px", borderRadius: 9,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving} style={{
              padding: "9px 20px", borderRadius: 9,
              background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
              border: "none", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.6 : 1, transition: "opacity 0.15s",
            }}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────
function MemberRowItem({
  avatar, name, email, role, badge, isSelf, canEdit, hasCustom,
  onEditPerms, onRemove,
}: {
  avatar: string | null; name: string; email: string; role: string;
  badge?: React.ReactNode; isSelf?: boolean; canEdit?: boolean; hasCustom?: boolean;
  onEditPerms?: () => void; onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      <Avatar name={name || email} avatarUrl={avatar} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name || email.split("@")[0]}
          {isSelf && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.25)" }}>você</span>}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {badge ?? <RoleBadge role={role} />}

        {onEditPerms && canEdit && (
          <button
            onClick={onEditPerms}
            style={{
              padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.12s",
              background: hasCustom ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${hasCustom ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)"}`,
              color: hasCustom ? "#fbbf24" : "rgba(255,255,255,0.4)",
            }}
          >
            {hasCustom ? "⚡ Custom" : "Permissões"}
          </button>
        )}
        {!onEditPerms && hasCustom && (
          <span style={{ fontSize: 11, color: "rgba(251,191,36,0.6)", fontWeight: 500 }}>⚡</span>
        )}

        {onRemove && canEdit && (
          <button
            onClick={onRemove}
            title="Remover"
            style={{
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 7, cursor: "pointer", color: "rgba(255,255,255,0.2)",
              fontSize: 15, transition: "all 0.12s", flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,113,113,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)";
            }}
          >×</button>
        )}
      </div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, overflow: "hidden",
      background: "rgba(255,255,255,0.015)",
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
    setInviteError(null); setInviteSuccess(false);
    setSentToken(null); setEmailSent(null); setEmailErrMsg(null); setTokenCopied(false);
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
      setInviteEmail(""); setInviteToken("");
      setInvitations(prev => [...prev, {
        id: crypto.randomUUID(), workspace_id: ownerId,
        email: emailBeingSent.toLowerCase(), role: inviteRole,
        token: "", invited_by: ownerId,
        expires_at: "2099-12-31T23:59:59Z",
        accepted_at: null, created_at: new Date().toISOString(),
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

  const pendingInvites = invitations.filter(inv => !inv.accepted_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

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
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(158,168,255,0.05)", border: "1px solid rgba(158,168,255,0.12)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="#9ea8ff" strokeWidth="1.4" opacity="0.7"/>
            <path d="M8 7v4M8 5.5v.5" stroke="#9ea8ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
          </svg>
          <span style={{ fontSize: 12, color: "rgba(158,168,255,0.7)" }}>
            Você tem acesso de <strong style={{ color: "#9ea8ff", fontWeight: 600 }}>{ROLE_LABELS[currentUserRole]}</strong>. Só admins e o dono gerenciam a equipe.
          </span>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 3 }}>Convidar pessoa</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              A pessoa entra pelo <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>/acesso</span> com o código que você gerar.
            </p>
          </div>

          <SectionCard>
            <form onSubmit={sendInvite} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Email + role */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(false); }}
                  required
                  style={{
                    flex: 1, minWidth: 0, padding: "9px 12px",
                    borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)",
                    fontSize: 13, outline: "none", fontFamily: "inherit",
                  }}
                />
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                  style={{
                    padding: "9px 10px", borderRadius: 9,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)", fontSize: 13, outline: "none",
                    fontFamily: "inherit", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <option value="viewer">Visualizador</option>
                  <option value="member">Membro</option>
                  {isCurrentUserOwner && <option value="admin">Admin</option>}
                </select>
              </div>

              {/* Token row */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <input
                    id="invite-token"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="——————"
                    value={inviteToken}
                    onChange={e => setInviteToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    style={{
                      width: 112, padding: "9px 12px",
                      borderRadius: 9, border: "1px solid rgba(158,168,255,0.2)",
                      background: "rgba(158,168,255,0.05)", color: "#9ea8ff",
                      fontSize: 18, fontFamily: "monospace", letterSpacing: "0.2em",
                      textAlign: "center", outline: "none",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInviteToken(String(Math.floor(100000 + Math.random() * 900000)))}
                  style={{
                    padding: "9px 14px", borderRadius: 9, flexShrink: 0,
                    background: "rgba(158,168,255,0.07)", border: "1px solid rgba(158,168,255,0.15)",
                    color: "#9ea8ff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Gerar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !inviteEmail || inviteToken.length !== 6}
                  style={{
                    flex: 1, padding: "9px 16px", borderRadius: 9,
                    background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
                    color: "hsl(230 35% 7%)", fontSize: 13, fontWeight: 700,
                    border: "none", cursor: (isPending || inviteToken.length !== 6) ? "not-allowed" : "pointer",
                    opacity: (isPending || inviteToken.length !== 6) ? 0.45 : 1,
                    fontFamily: "inherit", transition: "opacity 0.15s", whiteSpace: "nowrap",
                  }}
                >
                  {isPending ? "Enviando…" : "Enviar convite"}
                </button>
              </div>
            </form>

            {/* Error */}
            {inviteError && (
              <div style={{ padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 12, color: "#fca5a5" }}>⚠ {inviteError}</p>
              </div>
            )}

            {/* Success block */}
            {inviteSuccess && sentToken && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(52,211,153,0.9)" }}>Convite criado</span>
                  {emailSent === true && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>· email enviado</span>}
                  {emailSent === false && <span style={{ fontSize: 11, color: "#fbbf24" }}>· email não enviado</span>}
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(0,0,0,0.25)", border: "1px solid rgba(158,168,255,0.15)",
                }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Código</p>
                    <code style={{ fontSize: 22, fontWeight: 800, color: "#9ea8ff", fontFamily: "monospace", letterSpacing: "0.12em" }}>{sentToken}</code>
                  </div>
                  <button
                    onClick={copyToken}
                    style={{
                      padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      background: tokenCopied ? "rgba(52,211,153,0.12)" : "rgba(158,168,255,0.1)",
                      border: `1px solid ${tokenCopied ? "rgba(52,211,153,0.3)" : "rgba(158,168,255,0.2)"}`,
                      color: tokenCopied ? "#34d399" : "#9ea8ff",
                    }}
                  >
                    {tokenCopied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {emailSent === false && emailErrMsg && (
                  <p style={{ fontSize: 11, color: "rgba(251,191,36,0.65)", lineHeight: 1.5 }}>
                    {emailErrMsg.includes("RESEND_API_KEY")
                      ? "Configure RESEND_API_KEY para envio automático de emails."
                      : `Erro no email: ${emailErrMsg}`}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Members */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Membros</h2>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{memberList.length + 1}</span>
        </div>

        <SectionCard>
          {/* Owner */}
          <MemberRowItem
            avatar={ownerProfile.avatar_url}
            name={ownerProfile.name || ownerProfile.email.split("@")[0]}
            email={ownerProfile.email}
            role="owner"
            isSelf={isCurrentUserOwner}
            badge={
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <RoleBadge role="owner" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontWeight: 500 }}>acesso total</span>
              </div>
            }
          />

          {memberList.length > 0 && <Divider />}

          {memberList.map((m, i) => {
            const isSelf = m.user_id === currentUserId;
            const canEdit = canManage && !isSelf && !(currentUserRole === "admin" && m.role === "admin");
            return (
              <div key={m.user_id}>
                {i > 0 && <Divider />}
                <MemberRowItem
                  avatar={m.avatar_url}
                  name={m.name || m.email.split("@")[0]}
                  email={m.email}
                  role={m.role}
                  isSelf={isSelf}
                  canEdit={canEdit}
                  hasCustom={m.permissions !== null}
                  onEditPerms={canEdit ? () => setEditingMember(m) : undefined}
                  onRemove={canEdit ? () => removeMember(m.user_id) : undefined}
                />
              </div>
            );
          })}

          {memberList.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
                {canManage ? "Nenhum membro ainda. Envie um convite." : "Nenhum outro membro neste workspace."}
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Pending invitations */}
      {canManage && pendingInvites.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Pendentes</h2>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{pendingInvites.length}</span>
          </div>

          <SectionCard>
            {pendingInvites.map((inv, i) => (
              <div key={inv.id}>
                {i > 0 && <Divider />}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  {/* placeholder avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px dashed rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, color: "rgba(255,255,255,0.2)",
                  }}>?</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {inv.email}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                      {inv.expires_at.startsWith("2099") ? "Token permanente" : `Expira em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <RoleBadge role={inv.role} />
                    <button
                      onClick={() => revokeInvitation(inv.id)}
                      title="Cancelar convite"
                      style={{
                        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "none", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 7, cursor: "pointer", color: "rgba(255,255,255,0.2)",
                        fontSize: 15, transition: "all 0.12s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.12)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,113,113,0.3)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "none";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)";
                      }}
                    >×</button>
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {/* Role legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        {[
          { role: "owner",  desc: "tudo, sempre" },
          { role: "admin",  desc: "tudo + equipe" },
          { role: "member", desc: "cria, edita, publica" },
          { role: "viewer", desc: "só lê" },
        ].map(({ role, desc }) => {
          const c = ROLE_COLORS[role];
          return (
            <div key={role} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 20,
              background: c.bg, border: `1px solid ${c.border}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>{ROLE_LABELS[role]}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{desc}</span>
            </div>
          );
        })}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 20,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>⚡ Custom</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>permissões manuais</span>
        </div>
      </div>
    </div>
  );
}
