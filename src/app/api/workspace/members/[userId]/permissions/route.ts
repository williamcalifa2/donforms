/**
 * PATCH /api/workspace/members/[userId]/permissions
 * Body: { permissions: WorkspacePermissions | null }
 *   null → reset to role preset
 *
 * PUT /api/workspace/members/[userId]/permissions
 * Body: { role: "admin" | "member" | "viewer" }
 *   Changes role and clears custom permissions.
 *
 * Only workspace owner can change permissions.
 * Admins can change role/perms of viewers and members (not other admins).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveWorkspaceContext,
  setMemberPermissions,
  setMemberRole,
  getWorkspaceMemberRole,
} from "@/lib/workspace/getWorkspaceOwner";
import type { WorkspacePermissions } from "@/types/database.types";

type Params = { params: Promise<{ userId: string }> };

// ─── PATCH: update custom permissions ─────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { ownerId, role } = await resolveWorkspaceContext(user.id);

  // Only owner/admin can change permissions
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para alterar permissões." }, { status: 403 });
  }

  // Cannot modify the workspace owner
  if (targetUserId === ownerId) {
    return NextResponse.json({ error: "Permissões do owner são imutáveis." }, { status: 400 });
  }

  // Admin cannot modify other admins
  if (role === "admin") {
    const targetRole = await getWorkspaceMemberRole(ownerId, targetUserId);
    if (targetRole === "admin" || targetRole === "owner") {
      return NextResponse.json({ error: "Admin não pode modificar permissões de outros admins." }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  // null = reset to preset
  const permissions: WorkspacePermissions | null = body.permissions ?? null;

  const { error } = await setMemberPermissions(ownerId, targetUserId, permissions);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// ─── PUT: change role (resets custom permissions) ─────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { ownerId, role } = await resolveWorkspaceContext(user.id);

  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para alterar roles." }, { status: 403 });
  }

  if (targetUserId === ownerId) {
    return NextResponse.json({ error: "Role do owner é imutável." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const newRole = body?.role as string | undefined;
  if (!newRole || !["admin", "member", "viewer"].includes(newRole)) {
    return NextResponse.json({ error: "Role inválido." }, { status: 400 });
  }

  // Only owner can grant admin
  if (newRole === "admin" && role !== "owner") {
    return NextResponse.json({ error: "Apenas o owner pode promover a Admin." }, { status: 403 });
  }

  // Admin cannot change other admins
  if (role === "admin") {
    const targetRole = await getWorkspaceMemberRole(ownerId, targetUserId);
    if (targetRole === "admin") {
      return NextResponse.json({ error: "Admin não pode alterar role de outro Admin." }, { status: 403 });
    }
  }

  const { error } = await setMemberRole(ownerId, targetUserId, newRole as "admin" | "member" | "viewer");
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
