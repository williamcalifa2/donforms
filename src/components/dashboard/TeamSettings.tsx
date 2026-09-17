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
  owner: "Owner", admin: "Admin", member: "Membro", viewer: "Leitor",
};

// Accent colors per role — used only for the dot and badge text
const ROLE_HUE: Record<string, string> = {
  owner: "#f59e0b", admin: "#a78bfa", member: "#818cf8", viewer: "#64748b",
};

const PERM_GROUPS: { label: string; perms: { key: keyof WorkspacePermissions; label: string }[] }[] = [
  { label: "Formulários", perms: [
    { key: "forms_view",    label: "Ver" },
    { key: "forms_create",  label: "Criar" },
    { key: "forms_edit",    label: "Editar" },
    { key: "forms_publish", label: "Publicar" },
    { key: "forms_delete",  label: "Deletar" },
  ]},
  { label: "Respostas", perms: [
    { key: "responses_view",   label: "Ver" },
    { key: "responses_export", label: "Exportar CSV" },
  ]},
  { label: "Analytics", perms: [{ key: "analytics_view", label: "Ver" }] },
  { label: "Equipe",    perms: [{ key: "team_manage",    label: "Gerenciar membros" }] },
];

function genToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}

function IconEye({ crossed, size = 13 }: { crossed?: boolean; size?: number }) {
  return crossed ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ─── Token strip ──────────────────────────────────────────────────────────────
function TokenStrip({ token, onRefresh }: { token: string; onRefresh: () => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingLeft: 2 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>código de acesso</span>
      <code style={{
        fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace",
        letterSpacing: visible ? "0.12em" : "0.06em",
        color: visible ? "rgba(99,102,241,0.65)" : "rgba(255,255,255,0.15)",
        fontWeight: 600, minWidth: 52, display: "inline-block",
      }}>
        {visible ? token : "••••••"}
      </code>
      <button type="button" onClick={() => setVisible(v => !v)} title={visible ? "Esconder" : "Revelar código"}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)", padding: "2px 3px", lineHeight: 1, transition: "color 0.1s", display: "flex" }}
        onMouseEnter={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.6)"; }}
        onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.22)"; }}
      >
        <IconEye crossed={visible} />
      </button>
      {visible && (
        <button type="button" onClick={onRefresh} title="Gerar novo código"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 13, lineHeight: 1, padding: "2px 4px", transition: "color 0.1s" }}
          onMouseEnter={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.55)"; }}
          onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.2)"; }}
        >↻</button>
      )}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginLeft: "auto" }}>entra pelo /acesso</span>
    </div>
  );
}

// ─── Tiny avatar ──────────────────────────────────────────────────────────────
function Av({ name, url, size = 28 }: { name: string; url: string | null; size?: number }) {
  const initials = (name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "rgba(99,102,241,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 700, color: "rgba(99,102,241,0.9)", letterSpacing: "0.01em",
    }}>{initials}</div>
  );
}

// ─── Permission drawer ────────────────────────────────────────────────────────
function PermDrawer({
  member, canSetAdmin, onClose, onUpdated,
}: {
  member: MemberRow; canSetAdmin: boolean;
  onClose: () => void; onUpdated: (u: Partial<MemberRow>) => void;
}) {
  const preset0 = ROLE_PRESETS[member.role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
  const [perms, setPerms] = useState<WorkspacePermissions>(
    member.permissions ? { ...preset0, ...member.permissions } : preset0
  );
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(k: keyof WorkspacePermissions) { setPerms(p => ({ ...p, [k]: !p[k] })); }

  function pickRole(r: string) {
    setRole(r);
    setPerms(ROLE_PRESETS[r as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer);
  }

  function isCustom() {
    const p = ROLE_PRESETS[role as keyof typeof ROLE_PRESETS] ?? ROLE_PRESETS.viewer;
    return (Object.keys(perms) as (keyof WorkspacePermissions)[]).some(k => perms[k] !== p[k]);
  }

  async function save() {
    setSaving(true); setErr(null);
    if (role !== member.role) {
      const r = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? "Erro."); setSaving(false); return; }
    }
    const r2 = await fetch(`/api/workspace/members/${member.user_id}/permissions`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: isCustom() ? perms : null }),
    });
    if (!r2.ok) { setErr((await r2.json().catch(() => ({}))).error ?? "Erro."); setSaving(false); return; }
    onUpdated({ role, permissions: isCustom() ? perms : null });
    setSaving(false); onClose();
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", padding: "0 0 0 0",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#0a0a12", borderTop: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px 16px 0 0",
        maxHeight: "82vh", overflowY: "auto",
        paddingBottom: 32,
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Member info */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Av name={member.name || member.email} url={member.avatar_url} size={32} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
                {member.name || member.email.split("@")[0]}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{member.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.25)",
            fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "4px 6px",
          }}>×</button>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          {/* Role tabs */}
          <p style={LABEL_STYLE}>Nível</p>
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {(canSetAdmin ? ["viewer","member","admin"] : ["viewer","member"]).map(r => (
              <button key={r} onClick={() => pickRole(r)} style={{
                flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 500,
                cursor: "pointer", transition: "all 0.1s", fontFamily: "inherit",
                background: role === r ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                color: role === r ? "#818cf8" : "rgba(255,255,255,0.28)",
                border: `1px solid ${role === r ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)"}`,
              }}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Permissions */}
          {PERM_GROUPS.map(g => (
            <div key={g.label} style={{ marginBottom: 16 }}>
              <p style={LABEL_STYLE}>{g.label}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {g.perms.map(({ key, label }) => {
                  const on = perms[key];
                  return (
                    <button key={key} onClick={() => toggle(key)} style={{
                      padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.1s", fontFamily: "inherit",
                      background: on ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                      color: on ? "#818cf8" : "rgba(255,255,255,0.25)",
                      border: `1px solid ${on ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      {on ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {isCustom() && (
            <p style={{ fontSize: 11, color: "rgba(251,191,36,0.5)", marginBottom: 14 }}>
              Diferente do padrão do nível escolhido
            </p>
          )}

          {err && <p style={{ fontSize: 11, color: "#fca5a5", marginBottom: 14 }}>{err}</p>}

          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "9px 0", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{
              flex: 2, padding: "9px 0", borderRadius: 8,
              background: saving ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: saving ? "rgba(129,140,248,0.5)" : "#818cf8",
              fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
  marginBottom: 8,
};

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
  const [email, setEmail]                 = useState("");
  const [inviteRole, setInviteRole]       = useState<"admin"|"member"|"viewer">("member");
  const [token, setToken]                 = useState(genToken);
  const [inviteError, setInviteError]     = useState<string | null>(null);
  const [result, setResult]               = useState<{ token: string; emailSent: boolean; emailErr?: string } | null>(null);
  const [copied, setCopied]               = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [editing, setEditing]             = useState<MemberRow | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner   = currentUserId === ownerId;

  function refreshToken() { setToken(genToken()); }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null); setResult(null);
    const _email = email; const _token = token;
    startTransition(async () => {
      const res = await fetch("/api/workspace/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: _email, role: inviteRole, accessToken: _token }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Erro ao enviar convite."); return; }
      setResult({ token: data.accessToken ?? _token, emailSent: data.emailSent ?? false, emailErr: data.emailError });
      setEmail("");
      refreshToken();
      setInvitations(p => [...p, {
        id: crypto.randomUUID(), workspace_id: ownerId,
        email: _email.toLowerCase(), role: inviteRole,
        token: "", invited_by: ownerId,
        expires_at: "2099-12-31T23:59:59Z",
        accepted_at: null, created_at: new Date().toISOString(),
      }]);
    });
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result.token);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function removeMember(uid: string) {
    const r = await fetch(`/api/workspace/members/${uid}`, { method: "DELETE" });
    if (r.ok) setMemberList(p => p.filter(m => m.user_id !== uid));
  }

  async function revokeInvite(id: string) {
    const r = await fetch(`/api/workspace/invitations/${id}`, { method: "DELETE" });
    if (r.ok) setInvitations(p => p.filter(i => i.id !== id));
  }

  const pendingInvites = invitations.filter(i => !i.accepted_at);

  // shared row styles
  const ROW: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 0",
  };
  const HR: React.CSSProperties = {
    height: 1, background: "rgba(255,255,255,0.04)", border: "none", margin: "0",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 560 }}>

      {editing && (
        <PermDrawer
          member={editing} canSetAdmin={isOwner}
          onClose={() => setEditing(null)}
          onUpdated={u => {
            setMemberList(p => p.map(m => m.user_id === editing.user_id ? { ...m, ...u } : m));
            setEditing(null);
          }}
        />
      )}

      {/* ── Readonly notice ───────────────────────────────────────────── */}
      {!canManage && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
          Seu acesso:{" "}
          <span style={{ color: ROLE_HUE[currentUserRole] ?? "#818cf8", fontWeight: 600 }}>
            {ROLE_LABELS[currentUserRole]}
          </span>
          . Só admins e o dono podem gerenciar a equipe.
        </p>
      )}

      {/* ── Invite form ───────────────────────────────────────────────── */}
      {canManage && (
        <div>
          <p style={LABEL_STYLE}>Convidar</p>

          <form onSubmit={sendInvite}>
            {/* Main row */}
            <div style={{
              display: "flex", alignItems: "center",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}>
              <input
                id="invite-email"
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setInviteError(null); setResult(null); }}
                required
                style={{
                  flex: 1, minWidth: 0, padding: "10px 12px",
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.82)", fontSize: 13,
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.06)" }} />
              <select
                id="invite-role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as "admin"|"member"|"viewer")}
                style={{
                  padding: "10px 10px", background: "none", border: "none",
                  color: "rgba(255,255,255,0.45)", fontSize: 12,
                  outline: "none", fontFamily: "inherit", cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <option value="viewer">Leitor</option>
                <option value="member">Membro</option>
                {isOwner && <option value="admin">Admin</option>}
              </select>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.06)" }} />
              <button
                type="submit"
                disabled={isPending || !email}
                style={{
                  padding: "10px 14px", background: "none", border: "none",
                  color: (isPending || !email) ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.8)",
                  fontSize: 12, fontWeight: 600, cursor: (isPending || !email) ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "color 0.15s", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                {isPending ? "…" : "Convidar →"}
              </button>
            </div>

            {/* Token strip */}
            <TokenStrip token={token} onRefresh={refreshToken} />
          </form>

          {/* Error */}
          {inviteError && (
            <p style={{ fontSize: 11, color: "#fca5a5", marginTop: 8 }}>⚠ {inviteError}</p>
          )}

          {/* Success */}
          {result && (
            <div style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 9,
              background: "rgba(52,211,153,0.04)",
              border: "1px solid rgba(52,211,153,0.1)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", marginBottom: 5 }}>
                  Convite criado
                  {result.emailSent ? " · email enviado" : " · sem email"}
                </p>
                <code style={{
                  fontSize: 18, fontFamily: "'SF Mono','Fira Code',monospace",
                  letterSpacing: "0.15em", fontWeight: 700, color: "rgba(52,211,153,0.85)",
                }}>{result.token}</code>
              </div>
              <button onClick={copyResult} style={{
                padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
                background: copied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
                color: copied ? "#34d399" : "rgba(255,255,255,0.4)",
              }}>
                {copied ? "✓" : "Copiar"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Members ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <p style={{ ...LABEL_STYLE, margin: 0 }}>Membros</p>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>{memberList.length + 1}</span>
        </div>

        {/* Owner */}
        <div style={ROW}>
          <Av name={ownerProfile.name || ownerProfile.email} url={ownerProfile.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
              {ownerProfile.name || ownerProfile.email.split("@")[0]}
            </span>
            {isOwner && <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>você</span>}
            <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ownerProfile.email}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_HUE.owner }}>Owner</span>
        </div>

        {memberList.map(m => {
          const isSelf  = m.user_id === currentUserId;
          const canEdit = canManage && !isSelf && !(currentUserRole === "admin" && m.role === "admin");
          const custom  = m.permissions !== null;
          return (
            <div key={m.user_id}>
              <hr style={HR} />
              <div style={ROW}>
                <Av name={m.name || m.email} url={m.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
                    {m.name || m.email.split("@")[0]}
                  </span>
                  {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>você</span>}
                  <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.email}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_HUE[m.role] ?? ROLE_HUE.viewer }}>
                    {ROLE_LABELS[m.role]}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => setEditing(m)}
                      style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s",
                        background: "none",
                        border: `1px solid ${custom ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)"}`,
                        color: custom ? "rgba(251,191,36,0.65)" : "rgba(255,255,255,0.3)",
                      }}
                      onMouseEnter={e => { (e.currentTarget).style.borderColor = "rgba(255,255,255,0.18)"; (e.currentTarget).style.color = "rgba(255,255,255,0.7)"; }}
                      onMouseLeave={e => {
                        (e.currentTarget).style.borderColor = custom ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)";
                        (e.currentTarget).style.color = custom ? "rgba(251,191,36,0.65)" : "rgba(255,255,255,0.3)";
                      }}
                    >
                      {custom ? "⚡" : "·"} perm
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      title="Remover membro"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.15)", lineHeight: 1,
                        padding: "4px", transition: "color 0.1s", display: "flex",
                        borderRadius: 5,
                      }}
                      onMouseEnter={e => { (e.currentTarget).style.color = "#f87171"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.15)"; }}
                    ><IconTrash /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {memberList.length === 0 && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", paddingTop: 8 }}>
            {canManage ? "Nenhum membro ainda." : "Nenhum outro membro."}
          </p>
        )}
      </div>

      {/* ── Pending ───────────────────────────────────────────────────── */}
      {canManage && pendingInvites.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <p style={{ ...LABEL_STYLE, margin: 0 }}>Aguardando resposta</p>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>{pendingInvites.length}</span>
          </div>
          {pendingInvites.map((inv, i) => (
            <div key={inv.id}>
              {i > 0 && <hr style={HR} />}
              <div style={ROW}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  border: "1px dashed rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "rgba(255,255,255,0.2)",
                }}>?</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {inv.email}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                    {inv.expires_at.startsWith("2099") ? "permanente" : new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_HUE[inv.role] ?? ROLE_HUE.viewer }}>
                  {ROLE_LABELS[inv.role]}
                </span>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  title="Cancelar convite"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.15)", lineHeight: 1,
                    padding: "4px", transition: "color 0.1s", display: "flex",
                    borderRadius: 5,
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.color = "#f87171"; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.15)"; }}
                ><IconTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
        {[
          ["owner",  "Owner",  "acesso total"],
          ["admin",  "Admin",  "tudo + equipe"],
          ["member", "Membro", "cria, edita, publica"],
          ["viewer", "Leitor", "só lê"],
        ].map(([k, label, desc]) => (
          <span key={k} style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            <span style={{ color: ROLE_HUE[k], fontWeight: 600 }}>{label}</span> {desc}
          </span>
        ))}
      </div>
    </div>
  );
}
