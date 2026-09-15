"use client";

import { useState, useTransition, useEffect } from "react";
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
  owner:  { bg: "rgba(251,191,36,0.08)",   text: "#fbbf24", border: "rgba(251,191,36,0.18)" },
  admin:  { bg: "rgba(192,132,252,0.08)",  text: "#c084fc", border: "rgba(192,132,252,0.18)" },
  member: { bg: "rgba(129,140,248,0.08)",  text: "#818cf8", border: "rgba(129,140,248,0.18)" },
  viewer: { bg: "rgba(148,163,184,0.06)",  text: "#94a3b8", border: "rgba(148,163,184,0.15)" },
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

function genToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap",
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 34 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

// ─── Permission modal ─────────────────────────────────────────────────────────
function PermissionEditor({
  member, canSetAdmin, onClose, onUpdated,
}: {
  member: MemberRow; canSetAdmin: boolean;
  onClose: () => void; onUpdated: (updated: Partial<MemberRow>) => void;
}) {
  const rolePreset = ROLE_PRESETS[member.role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
  const initial: WorkspacePermissions = member.permissions
    ? { ...rolePreset, ...member.permissions } : rolePreset;

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
    setSaving(true); setError(null);
    if (selectedRole !== member.role) {
      const res = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erro ao alterar nível."); setSaving(false); return;
      }
    }
    const customPerms = isCustom() ? perms : null;
    const res2 = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: customPerms }),
    });
    if (!res2.ok) {
      const d = await res2.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar."); setSaving(false); return;
    }
    onUpdated({ role: selectedRole, permissions: customPerms });
    setSaving(false); onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#0c0c18", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20, width: "100%", maxWidth: 420,
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={member.name || member.email} avatarUrl={member.avatar_url} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                {member.name || member.email.split("@")[0]}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{member.email}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 7, color: "rgba(255,255,255,0.35)", fontSize: 16, cursor: "pointer",
          }}>×</button>
        </div>

        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Role */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
              Nível de acesso
            </p>
            <div style={{ display: "flex", gap: 5 }}>
              {(canSetAdmin ? ["viewer", "member", "admin"] : ["viewer", "member"]).map(r => {
                const isSelected = selectedRole === r;
                const c = ROLE_COLORS[r];
                return (
                  <button key={r} onClick={() => applyPreset(r)} style={{
                    flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.12s",
                    background: isSelected ? c.bg : "transparent",
                    color: isSelected ? c.text : "rgba(255,255,255,0.25)",
                    border: `1px solid ${isSelected ? c.border : "rgba(255,255,255,0.05)"}`,
                  }}>
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PERM_GROUPS.map(group => (
              <div key={group.label}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: 6 }}>
                  {group.label}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {group.perms.map(({ key, label }) => {
                    const on = perms[key];
                    return (
                      <label key={key} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 8px", borderRadius: 7, cursor: "pointer",
                        background: on ? "rgba(129,140,248,0.05)" : "transparent",
                        transition: "background 0.1s",
                      }}>
                        <span
                          role="checkbox" aria-checked={on} tabIndex={0}
                          onClick={() => toggle(key)}
                          onKeyDown={e => { if (e.key === " " || e.key === "Enter") toggle(key); }}
                          style={{
                            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: on ? "#818cf8" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${on ? "#818cf8" : "rgba(255,255,255,0.1)"}`,
                            transition: "all 0.12s",
                          }}
                        >
                          {on && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <input type="checkbox" checked={on} onChange={() => toggle(key)} style={{ display: "none" }} />
                        <span style={{ fontSize: 12, color: on ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.27)", transition: "color 0.1s" }}>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {isCustom() && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8,
              background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.14)",
            }}>
              <span style={{ fontSize: 11, color: "rgba(251,191,36,0.8)" }}>⚡ Diferente do padrão desse nível</span>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "#fca5a5", padding: "8px 10px", borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 8,
              background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{
              padding: "8px 18px", borderRadius: 8,
              background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
              border: "none", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: saving ? 0.55 : 1, transition: "opacity 0.15s",
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
function MemberItem({
  avatar, name, email, role, isSelf, rightSlot,
}: {
  avatar: string | null; name: string; email: string; role: string;
  isSelf?: boolean; rightSlot?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "11px 14px",
        background: hover ? "rgba(255,255,255,0.015)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      <Avatar name={name || email} avatarUrl={avatar} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {name || email.split("@")[0]}
          {isSelf && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.22)", letterSpacing: "0.01em" }}>
              você
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{email}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <RoleBadge role={role} />
        {rightSlot}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 14px" }} />;
}

function RemoveBtn({ onClick, title }: { onClick: () => void; title: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
        background: hover ? "rgba(248,113,113,0.1)" : "transparent",
        border: `1px solid ${hover ? "rgba(248,113,113,0.22)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 6, cursor: "pointer",
        color: hover ? "#f87171" : "rgba(255,255,255,0.18)",
        fontSize: 14, transition: "all 0.12s",
      }}
    >×</button>
  );
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
  const [inviteToken, setInviteToken]     = useState(genToken);
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

  // Refresh token after successful invite
  useEffect(() => {
    if (inviteSuccess) setInviteToken(genToken());
  }, [inviteSuccess]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null); setInviteSuccess(false);
    setSentToken(null); setEmailSent(null); setEmailErrMsg(null); setTokenCopied(false);
    const emailBeingSent = inviteEmail;
    const tokenBeingSent = inviteToken;
    startTransition(async () => {
      const res = await fetch("/api/workspace/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailBeingSent, role: inviteRole, accessToken: tokenBeingSent }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Erro ao enviar convite."); return; }
      setInviteSuccess(true);
      setSentToken(data.accessToken ?? tokenBeingSent);
      setEmailSent(data.emailSent ?? false);
      setEmailErrMsg(data.emailError ?? null);
      setInviteEmail("");
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

  const card: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12, overflow: "hidden",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {editingMember && (
        <PermissionEditor
          member={editingMember} canSetAdmin={isCurrentUserOwner}
          onClose={() => setEditingMember(null)}
          onUpdated={updated => { handleMemberUpdated(editingMember.user_id, updated); setEditingMember(null); }}
        />
      )}

      {!canManage && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10,
          background: "rgba(158,168,255,0.04)", border: "1px solid rgba(158,168,255,0.1)",
        }}>
          <span style={{ fontSize: 12, color: "rgba(158,168,255,0.6)" }}>
            Você tem acesso de{" "}
            <strong style={{ color: "#9ea8ff", fontWeight: 600 }}>{ROLE_LABELS[currentUserRole]}</strong>.
            Só admins e o dono gerenciam a equipe.
          </span>
        </div>
      )}

      {/* ── Invite ───────────────────────────────────────────────────────── */}
      {canManage && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
            Convidar pessoa
          </h2>
          <div style={card}>
            <form onSubmit={sendInvite}>
              {/* Row: email + role + send */}
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(false); }}
                  required
                  style={{
                    flex: 1, minWidth: 0, padding: "11px 14px",
                    background: "transparent", border: "none",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.82)", fontSize: 13,
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                  style={{
                    padding: "11px 12px", background: "transparent",
                    border: "none", borderRight: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.55)", fontSize: 12,
                    outline: "none", fontFamily: "inherit", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <option value="viewer">Visualizador</option>
                  <option value="member">Membro</option>
                  {isCurrentUserOwner && <option value="admin">Admin</option>}
                </select>
                <button
                  type="submit"
                  disabled={isPending || !inviteEmail}
                  style={{
                    padding: "11px 18px", background: "rgba(158,168,255,0.1)",
                    border: "none", color: "#9ea8ff", fontSize: 12, fontWeight: 600,
                    cursor: (isPending || !inviteEmail) ? "not-allowed" : "pointer",
                    opacity: (isPending || !inviteEmail) ? 0.4 : 1,
                    fontFamily: "inherit", transition: "opacity 0.15s", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {isPending ? "Enviando…" : "Convidar"}
                </button>
              </div>

              {/* Token row — subtle, below the main input */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(255,255,255,0.01)",
              }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Código de acesso</span>
                <code style={{
                  fontSize: 13, fontFamily: "monospace", letterSpacing: "0.15em",
                  color: "rgba(158,168,255,0.7)", fontWeight: 600,
                }}>{inviteToken}</code>
                <button
                  type="button"
                  onClick={() => setInviteToken(genToken())}
                  style={{
                    marginLeft: "auto", padding: "3px 9px", borderRadius: 6,
                    background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = "rgba(158,168,255,0.25)"; (e.currentTarget).style.color = "#9ea8ff"; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget).style.color = "rgba(255,255,255,0.3)"; }}
                >
                  Gerar novo
                </button>
              </div>
            </form>

            {inviteError && (
              <div style={{ padding: "9px 14px", borderTop: "1px solid rgba(248,113,113,0.1)", background: "rgba(248,113,113,0.04)" }}>
                <p style={{ fontSize: 12, color: "#fca5a5" }}>⚠ {inviteError}</p>
              </div>
            )}

            {inviteSuccess && sentToken && (
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.04)",
                padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(52,211,153,0.85)" }}>Convite criado</span>
                  {emailSent === true && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>· email enviado</span>}
                  {emailSent === false && <span style={{ fontSize: 11, color: "rgba(251,191,36,0.7)" }}>· sem email configurado</span>}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 9,
                  background: "rgba(0,0,0,0.2)", border: "1px solid rgba(158,168,255,0.12)",
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>Código</p>
                    <code style={{ fontSize: 20, fontFamily: "monospace", fontWeight: 800, color: "#9ea8ff", letterSpacing: "0.12em" }}>{sentToken}</code>
                  </div>
                  <button onClick={copyToken} style={{
                    padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0,
                    background: tokenCopied ? "rgba(52,211,153,0.1)" : "rgba(158,168,255,0.08)",
                    border: `1px solid ${tokenCopied ? "rgba(52,211,153,0.25)" : "rgba(158,168,255,0.15)"}`,
                    color: tokenCopied ? "#34d399" : "#9ea8ff",
                  }}>
                    {tokenCopied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                {emailSent === false && emailErrMsg && (
                  <p style={{ fontSize: 11, color: "rgba(251,191,36,0.5)", lineHeight: 1.5 }}>
                    {emailErrMsg.includes("RESEND_API_KEY")
                      ? "Configure RESEND_API_KEY para envio automático."
                      : `Erro: ${emailErrMsg}`}
                  </p>
                )}
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 7 }}>
            A pessoa entra pelo <span style={{ color: "rgba(255,255,255,0.35)" }}>/acesso</span> com o código acima.
          </p>
        </div>
      )}

      {/* ── Members ──────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Membros</h2>
          <span style={{
            fontSize: 11, padding: "1px 7px", borderRadius: 20,
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)",
          }}>{memberList.length + 1}</span>
        </div>

        <div style={card}>
          <MemberItem
            avatar={ownerProfile.avatar_url}
            name={ownerProfile.name || ownerProfile.email.split("@")[0]}
            email={ownerProfile.email}
            role="owner"
            isSelf={isCurrentUserOwner}
            rightSlot={
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>acesso total</span>
            }
          />

          {memberList.map((m, i) => {
            const isSelf = m.user_id === currentUserId;
            const canEdit = canManage && !isSelf && !(currentUserRole === "admin" && m.role === "admin");
            const hasCustom = m.permissions !== null;
            return (
              <div key={m.user_id}>
                <Divider />
                <MemberItem
                  avatar={m.avatar_url}
                  name={m.name || m.email.split("@")[0]}
                  email={m.email}
                  role={m.role}
                  isSelf={isSelf}
                  rightSlot={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {canEdit && (
                        <button
                          onClick={() => setEditingMember(m)}
                          style={{
                            padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                            background: hasCustom ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${hasCustom ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.06)"}`,
                            color: hasCustom ? "#fbbf24" : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {hasCustom ? "⚡ Custom" : "Permissões"}
                        </button>
                      )}
                      {!canEdit && hasCustom && (
                        <span style={{ fontSize: 11, color: "rgba(251,191,36,0.5)" }}>⚡</span>
                      )}
                      {canEdit && <RemoveBtn onClick={() => removeMember(m.user_id)} title="Remover membro" />}
                    </div>
                  }
                />
              </div>
            );
          })}

          {memberList.length === 0 && (
            <div style={{ padding: "20px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
                {canManage ? "Nenhum membro ainda." : "Nenhum outro membro neste workspace."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pending ──────────────────────────────────────────────────────── */}
      {canManage && pendingInvites.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Aguardando</h2>
            <span style={{
              fontSize: 11, padding: "1px 7px", borderRadius: 20,
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)",
            }}>{pendingInvites.length}</span>
          </div>
          <div style={card}>
            {pendingInvites.map((inv, i) => (
              <div key={inv.id}>
                {i > 0 && <Divider />}
                <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: "transparent", border: "1.5px dashed rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "rgba(255,255,255,0.2)",
                  }}>?</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inv.email}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>
                      {inv.expires_at.startsWith("2099") ? "Token permanente" : `Expira em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                    <RoleBadge role={inv.role} />
                    <RemoveBtn onClick={() => revokeInvitation(inv.id)} title="Cancelar convite" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5,
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
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 8px", borderRadius: 20,
              background: c.bg, border: `1px solid ${c.border}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{ROLE_LABELS[role]}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
