"use client";

import { useState, useTransition } from "react";
import type { WorkspaceInvitation } from "@/types/database.types";

interface MemberRow {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface Props {
  members: MemberRow[];
  invitations: WorkspaceInvitation[];
  ownerId: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:  { bg: "rgba(168,85,247,0.12)",  text: "#c084fc" },
  member: { bg: "rgba(99,102,241,0.12)",  text: "#818cf8" },
  viewer: { bg: "rgba(148,163,184,0.1)",  text: "#94a3b8" },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text, letterSpacing: "0.02em",
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size < 36 ? 11 : 14, fontWeight: 700, color: "#fff",
      flexShrink: 0,
    }}>
      {initials || "?"}
    </div>
  );
}

export function TeamSettings({ members, invitations: initialInvitations, ownerId }: Props) {
  const [memberList, setMemberList]       = useState(members);
  const [invitations, setInvitations]     = useState(initialInvitations);
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteRole, setInviteRole]       = useState<"admin" | "member" | "viewer">("member");
  const [inviteToken, setInviteToken]     = useState("");
  const [inviteError, setInviteError]     = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLink, setInviteLink]       = useState<string | null>(null);
  const [sentToken, setSentToken]         = useState<string | null>(null);
  const [emailSent, setEmailSent]         = useState<boolean | null>(null);
  const [emailErrMsg, setEmailErrMsg]     = useState<string | null>(null);
  const [tokenCopied, setTokenCopied]     = useState(false);
  const [linkCopied, setLinkCopied]       = useState(false);
  const [isPending, startTransition]      = useTransition();

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    setInviteLink(null);
    setSentToken(null);
    setEmailSent(null);
    setEmailErrMsg(null);
    setLinkCopied(false);
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
      setInviteLink(data.accessUrl ?? null);
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
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        accepted_at: null,
        created_at: new Date().toISOString(),
      }]);
    });
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
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

      {/* ── Invite form ───────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
          Convidar membro
        </h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
          O convidado recebe o token de acesso por email e usa em <strong style={{ color: "rgba(255,255,255,0.5)" }}>/acesso</strong> para entrar sem criar conta.
        </p>

        <form onSubmit={sendInvite} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="email@empresa.com"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(false); }}
              required
              style={{
                flex: "1 1 220px",
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)", fontSize: 13,
                outline: "none", fontFamily: "inherit",
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
              style={{
                padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)", fontSize: 13,
                outline: "none", fontFamily: "inherit", cursor: "pointer",
              }}
            >
              <option value="viewer">Visualizador</option>
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Token de acesso — 6 dígitos */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="000000"
              value={inviteToken}
              onChange={e => setInviteToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              style={{
                width: 120, flexShrink: 0,
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(158,168,255,0.2)",
                color: "var(--accent-c)", fontSize: 20,
                outline: "none", fontFamily: "monospace",
                letterSpacing: "0.15em", textAlign: "center",
              }}
            />
            <button
              type="button"
              onClick={() => setInviteToken(String(Math.floor(100000 + Math.random() * 900000)))}
              style={{
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(158,168,255,0.08)",
                border: "1px solid rgba(158,168,255,0.15)",
                color: "var(--accent-c)", fontSize: 12,
                fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              Gerar
            </button>
            <button
              type="submit"
              disabled={isPending || !inviteEmail || inviteToken.length !== 6}
              style={{
                flex: 1,
                padding: "10px 20px", borderRadius: 10,
                background: "var(--accent-c)", color: "hsl(230 35% 7%)",
                fontSize: 13, fontWeight: 700,
                border: "none", cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending || inviteToken.length !== 6 ? 0.5 : 1,
                fontFamily: "inherit", transition: "opacity 0.15s", whiteSpace: "nowrap",
              }}
            >
              {isPending ? "Enviando…" : "Enviar convite"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>
            Token de 6 dígitos — use "Gerar" para criar automaticamente.
          </p>
        </form>

        {inviteError && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>⚠ {inviteError}</p>
        )}

        {inviteSuccess && (
          <div style={{
            marginTop: 12, padding: "16px",
            borderRadius: 12,
            background: "rgba(158,168,255,0.06)",
            border: "1px solid rgba(158,168,255,0.2)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--accent-c)", fontWeight: 600 }}>
                ✓ Convite criado
              </span>
              {emailSent === true && (
                <span style={{ fontSize: 11, color: "rgba(158,168,255,0.6)" }}>· token enviado por email</span>
              )}
              {emailSent === false && (
                <span style={{ fontSize: 11, color: "#fbbf24" }}>· email não enviado</span>
              )}
            </div>

            {/* Token destaque */}
            {sentToken && (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(158,168,255,0.15)",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  Token de acesso
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code style={{
                    flex: 1, fontSize: 18, fontWeight: 700,
                    color: "var(--accent-c)", fontFamily: "monospace",
                    letterSpacing: "0.05em",
                  }}>
                    {sentToken}
                  </code>
                  <button onClick={copyToken} style={{
                    padding: "5px 12px", borderRadius: 8,
                    background: tokenCopied ? "rgba(52,211,153,0.15)" : "rgba(158,168,255,0.12)",
                    border: `1px solid ${tokenCopied ? "rgba(52,211,153,0.3)" : "rgba(158,168,255,0.2)"}`,
                    color: tokenCopied ? "#34d399" : "var(--accent-c)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    {tokenCopied ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  A pessoa entra em <strong style={{ color: "rgba(255,255,255,0.5)" }}>donforms.dondigital.com.br/acesso</strong> e digita este token.
                </p>
              </div>
            )}

            {emailSent === false && emailErrMsg && (
              <p style={{ fontSize: 11, color: "rgba(251,191,36,0.7)", margin: 0 }}>
                ⚠ {emailErrMsg.includes("RESEND_API_KEY") ? "Configure RESEND_API_KEY para envio automático." : `Erro: ${emailErrMsg}`}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Members table ─────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
          Membros · {memberList.length + 1} {/* +1 for owner */}
        </h2>

        <div style={{
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Owner row (always first) */}
              <tr>
                <td style={cellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={members[0]?.name ?? "Você"} avatarUrl={null} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                        Você (owner)
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellStyle, width: 100 }}>
                  <RoleBadge role="owner" />
                </td>
                <td style={{ ...cellStyle, width: 60 }} />
              </tr>

              {memberList.map(m => (
                <tr key={m.user_id}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={m.name || m.email} avatarUrl={m.avatar_url} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                          {m.name || m.email.split("@")[0]}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, width: 100 }}>
                    <RoleBadge role={m.role} />
                  </td>
                  <td style={{ ...cellStyle, width: 60, textAlign: "right" }}>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      title="Remover membro"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.25)",
                        padding: "4px 6px", borderRadius: 6,
                        fontSize: 16, lineHeight: 1,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {memberList.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              Nenhum membro ainda. Envie um convite acima.
            </div>
          )}
        </div>
      </section>

      {/* ── Pending invitations ───────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
            Convites pendentes · {pendingInvites.length}
          </h2>
          <div style={{
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {pendingInvites.map(inv => (
                  <tr key={inv.id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, color: "rgba(255,255,255,0.3)",
                        }}>
                          ?
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                            {inv.email}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                            Expira em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...cellStyle, width: 100 }}>
                      <RoleBadge role={inv.role} />
                    </td>
                    <td style={{ ...cellStyle, width: 60, textAlign: "right" }}>
                      <button
                        onClick={() => revokeInvitation(inv.id)}
                        title="Cancelar convite"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "rgba(255,255,255,0.25)",
                          padding: "4px 6px", borderRadius: 6,
                          fontSize: 16, lineHeight: 1,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
                      >
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
          <strong style={{ color: "rgba(255,255,255,0.4)" }}>Visualizador</strong> — vê formulários e respostas.{" "}
          <strong style={{ color: "rgba(255,255,255,0.4)" }}>Membro</strong> — edita formulários.{" "}
          <strong style={{ color: "rgba(255,255,255,0.4)" }}>Admin</strong> — tudo + gerencia equipe e pode deletar formulários.
        </p>
      </section>
    </div>
  );
}
