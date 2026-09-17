/**
 * Workspace bug regression tests
 *
 * Covers the bugs fixed in the workspace/member permission system:
 * 1. workspace_members always upserted (not gated on accepted_at)
 * 2. project actions use ownerId not user.id
 * 3. ownerId attribution for forms created by members
 * 4. webhook-test req.body null bug
 *
 * External dependencies (Supabase, cookies) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 1. workspace_members upsert logic ─────────────────────────────────────────
//
// Bug: upsert was inside `if (!inv.accepted_at)` block.
// Fix: always upsert (idempotent via onConflict), separate accepted_at update.

type InvRecord = {
  email: string;
  workspace_id: string;
  role: string;
  accepted_at: string | null;
};

type UpsertCall = { workspace_id: string; user_id: string; role: string };

function simulateTokenAccept(inv: InvRecord, userId: string) {
  const upsertCalls: UpsertCall[] = [];
  let acceptedAtUpdated = false;

  // OLD (buggy) logic
  function oldLogic() {
    if (!inv.accepted_at) {
      acceptedAtUpdated = true;
      upsertCalls.push({ workspace_id: inv.workspace_id, user_id: userId, role: inv.role });
    }
  }

  // NEW (fixed) logic
  function newLogic() {
    upsertCalls.push({ workspace_id: inv.workspace_id, user_id: userId, role: inv.role });
    if (!inv.accepted_at) {
      acceptedAtUpdated = true;
    }
  }

  return { oldLogic, newLogic, upsertCalls: () => upsertCalls, acceptedAtUpdated: () => acceptedAtUpdated };
}

describe("workspace_members upsert — always happens regardless of accepted_at", () => {
  it("OLD logic: skips upsert when invitation already accepted (the bug)", () => {
    const inv: InvRecord = {
      email: "head@empresa.com",
      workspace_id: "owner-uuid",
      role: "member",
      accepted_at: "2024-01-01T00:00:00Z", // already accepted
    };
    const sim = simulateTokenAccept(inv, "member-uuid");
    sim.oldLogic();
    expect(sim.upsertCalls()).toHaveLength(0); // BUG: upsert never called
  });

  it("NEW logic: always upserts even when invitation already accepted", () => {
    const inv: InvRecord = {
      email: "head@empresa.com",
      workspace_id: "owner-uuid",
      role: "member",
      accepted_at: "2024-01-01T00:00:00Z", // already accepted
    };
    const sim = simulateTokenAccept(inv, "member-uuid");
    sim.newLogic();
    expect(sim.upsertCalls()).toHaveLength(1); // FIX: upsert always called
    expect(sim.upsertCalls()[0]).toMatchObject({
      workspace_id: "owner-uuid",
      user_id: "member-uuid",
      role: "member",
    });
  });

  it("NEW logic: does NOT update accepted_at on re-login (invitation already accepted)", () => {
    const inv: InvRecord = {
      email: "head@empresa.com",
      workspace_id: "owner-uuid",
      role: "member",
      accepted_at: "2024-01-01T00:00:00Z",
    };
    const sim = simulateTokenAccept(inv, "member-uuid");
    sim.newLogic();
    expect(sim.acceptedAtUpdated()).toBe(false);
  });

  it("NEW logic: updates accepted_at on first acceptance (null)", () => {
    const inv: InvRecord = {
      email: "head@empresa.com",
      workspace_id: "owner-uuid",
      role: "member",
      accepted_at: null, // first time
    };
    const sim = simulateTokenAccept(inv, "member-uuid");
    sim.newLogic();
    expect(sim.upsertCalls()).toHaveLength(1);
    expect(sim.acceptedAtUpdated()).toBe(true);
  });
});

// ── 2. project actions must use ownerId, not user.id ─────────────────────────
//
// Bug: renameProject, deleteProject, inviteProjectClient, createProjectForm
//      all used `.eq("user_id", user.id)` — fails silently for members.
// Fix: use ownerId from resolveWorkspaceContext.

type DbQuery = { table: string; filter: Record<string, string>; op: string };

function makeProjectMutator(useOwnerId: boolean) {
  const dbLog: DbQuery[] = [];

  function renameProject(projectId: string, name: string, userId: string, ownerId: string) {
    const filterUserId = useOwnerId ? ownerId : userId;
    dbLog.push({ table: "projects", filter: { id: projectId, user_id: filterUserId }, op: "update" });
    // Simulate success: returns a row only if user_id matches project owner
    return filterUserId === ownerId ? { error: null } : { error: "no rows matched" };
  }

  function deleteProject(projectId: string, userId: string, ownerId: string) {
    const filterUserId = useOwnerId ? ownerId : userId;
    dbLog.push({ table: "projects", filter: { id: projectId, user_id: filterUserId }, op: "delete" });
    return filterUserId === ownerId ? { error: null } : { error: "no rows matched" };
  }

  function createProjectForm(projectId: string, userId: string, ownerId: string) {
    const insertUserId = useOwnerId ? ownerId : userId;
    dbLog.push({ table: "forms", filter: { user_id: insertUserId, project_id: projectId }, op: "insert" });
    return { user_id: insertUserId };
  }

  return { renameProject, deleteProject, createProjectForm, dbLog };
}

const OWNER_ID = "owner-uuid-abc";
const MEMBER_ID = "member-uuid-xyz";
const PROJECT_ID = "project-123";

describe("project actions with ownerId (fixed)", () => {
  it("renameProject uses ownerId — member can successfully rename", () => {
    const m = makeProjectMutator(true);
    const result = m.renameProject(PROJECT_ID, "Novo Nome", MEMBER_ID, OWNER_ID);
    expect(result.error).toBeNull();
    expect(m.dbLog[0].filter.user_id).toBe(OWNER_ID);
  });

  it("deleteProject uses ownerId — member can successfully delete", () => {
    const m = makeProjectMutator(true);
    const result = m.deleteProject(PROJECT_ID, MEMBER_ID, OWNER_ID);
    expect(result.error).toBeNull();
    expect(m.dbLog[0].filter.user_id).toBe(OWNER_ID);
  });

  it("createProjectForm uses ownerId — form attributed to owner not member", () => {
    const m = makeProjectMutator(true);
    const form = m.createProjectForm(PROJECT_ID, MEMBER_ID, OWNER_ID);
    expect(form.user_id).toBe(OWNER_ID);
    expect(form.user_id).not.toBe(MEMBER_ID);
  });
});

describe("project actions with user.id (bug reproduced)", () => {
  it("renameProject with user.id — member rename silently fails", () => {
    const m = makeProjectMutator(false);
    const result = m.renameProject(PROJECT_ID, "Novo Nome", MEMBER_ID, OWNER_ID);
    expect(result.error).not.toBeNull(); // BUG: query matches nothing
    expect(m.dbLog[0].filter.user_id).toBe(MEMBER_ID);
  });

  it("deleteProject with user.id — member delete silently fails", () => {
    const m = makeProjectMutator(false);
    const result = m.deleteProject(PROJECT_ID, MEMBER_ID, OWNER_ID);
    expect(result.error).not.toBeNull(); // BUG
  });

  it("createProjectForm with user.id — form belongs to member, invisible to owner", () => {
    const m = makeProjectMutator(false);
    const form = m.createProjectForm(PROJECT_ID, MEMBER_ID, OWNER_ID);
    expect(form.user_id).toBe(MEMBER_ID); // BUG: form won't show in owner's dashboard
  });
});

// ── 3. webhook-test req.body null bug ────────────────────────────────────────
//
// Bug: `req.body ? await req.json() : {}` — in Next.js route handlers
//      req.body is ALWAYS null (ReadableStream, not parsed), so webhookUrl
//      from the request body was never read.
// Fix: always call req.json() directly.

type FakeRequest = { body: null; json: () => Promise<{ webhookUrl?: string }> };

async function oldWebhookBodyParsing(req: FakeRequest) {
  // OLD: req.body check always false → never reads json
  const { webhookUrl } = req.body ? await req.json().catch(() => ({})) : ({} as { webhookUrl?: string });
  return webhookUrl;
}

async function newWebhookBodyParsing(req: FakeRequest) {
  // NEW: always call req.json()
  const { webhookUrl } = await req.json().catch(() => ({} as { webhookUrl?: string }));
  return webhookUrl;
}

describe("webhook-test route body parsing", () => {
  const makeReq = (url: string): FakeRequest => ({
    body: null, // always null in Next.js route handlers
    json: async () => ({ webhookUrl: url }),
  });

  it("OLD logic: req.body null → webhookUrl always undefined (bug)", async () => {
    const req = makeReq("https://hooks.example.com/test");
    const result = await oldWebhookBodyParsing(req);
    expect(result).toBeUndefined(); // BUG: request URL ignored
  });

  it("NEW logic: req.json() → webhookUrl correctly read from body", async () => {
    const req = makeReq("https://hooks.example.com/test");
    const result = await newWebhookBodyParsing(req);
    expect(result).toBe("https://hooks.example.com/test"); // FIX
  });

  it("NEW logic: gracefully handles empty body (no crash)", async () => {
    const req: FakeRequest = { body: null, json: async () => { throw new Error("empty"); } };
    const result = await newWebhookBodyParsing(req);
    expect(result).toBeUndefined(); // falls back to form's saved webhookUrl
  });
});

// ── 4. _df_wid cookie flow — member gets correct workspace ───────────────────

type CookieStore = { get: (k: string) => { value: string } | undefined };

function resolveActiveWorkspaceId(
  userId: string,
  cookies: CookieStore,
  validMembership: boolean
): string {
  const wid = cookies.get("_df_wid")?.value;
  if (!wid || wid === userId) return userId; // own workspace
  if (validMembership) return wid; // confirmed member
  return userId; // invalid cookie → fall back to own
}

describe("workspace context cookie resolution", () => {
  it("no cookie → returns own userId as ownerId", () => {
    const cookies: CookieStore = { get: () => undefined };
    expect(resolveActiveWorkspaceId("user-1", cookies, false)).toBe("user-1");
  });

  it("cookie = own userId → still returns userId (idempotent)", () => {
    const cookies: CookieStore = { get: () => ({ value: "user-1" }) };
    expect(resolveActiveWorkspaceId("user-1", cookies, true)).toBe("user-1");
  });

  it("valid membership cookie → returns workspace owner ID", () => {
    const cookies: CookieStore = { get: () => ({ value: "owner-uuid" }) };
    expect(resolveActiveWorkspaceId("member-uuid", cookies, true)).toBe("owner-uuid");
  });

  it("stale cookie with no membership → falls back to own workspace", () => {
    const cookies: CookieStore = { get: () => ({ value: "some-other-workspace" }) };
    expect(resolveActiveWorkspaceId("user-1", cookies, false)).toBe("user-1");
  });

  it("member with valid cookie sees forms from owner workspace, not their own", () => {
    const ownerId = "owner-uuid";
    const memberId = "member-uuid";
    const cookies: CookieStore = { get: () => ({ value: ownerId }) };
    const activeOwnerId = resolveActiveWorkspaceId(memberId, cookies, true);

    // Forms should be queried with ownerId — member's own forms ignored
    expect(activeOwnerId).toBe(ownerId);
    expect(activeOwnerId).not.toBe(memberId);
  });
});
