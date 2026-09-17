/**
 * Permission system — unit tests
 *
 * Covers: role presets match spec, resolvePermissions merging,
 * and permission helpers. All pure functions — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  ROLE_PRESETS,
  OWNER_PERMISSIONS,
  resolvePermissions,
  type WorkspaceRole,
} from "@/lib/workspace/permissions";
import {
  canManageTeam,
  canEditForms,
  canCreateForms,
  canDeleteForms,
  canViewResponses,
  canExportResponses,
  canViewAnalytics,
} from "@/lib/workspace/getWorkspaceOwner";

// ── Role presets match spec ───────────────────────────────────────────────────

describe("ROLE_PRESETS — admin", () => {
  const p = ROLE_PRESETS.admin;

  it("can do everything including team management", () => {
    expect(p.forms_view).toBe(true);
    expect(p.forms_create).toBe(true);
    expect(p.forms_edit).toBe(true);
    expect(p.forms_publish).toBe(true);
    expect(p.forms_delete).toBe(true);
    expect(p.responses_view).toBe(true);
    expect(p.responses_export).toBe(true);
    expect(p.analytics_view).toBe(true);
    expect(p.team_manage).toBe(true);
  });
});

describe("ROLE_PRESETS — member (= admin minus team_manage)", () => {
  const p = ROLE_PRESETS.member;

  it("can view, create, edit, publish forms", () => {
    expect(p.forms_view).toBe(true);
    expect(p.forms_create).toBe(true);
    expect(p.forms_edit).toBe(true);
    expect(p.forms_publish).toBe(true);
  });

  it("can delete forms (fixed: was false)", () => {
    expect(p.forms_delete).toBe(true);
  });

  it("can export responses (fixed: was false)", () => {
    expect(p.responses_export).toBe(true);
  });

  it("can view responses and analytics", () => {
    expect(p.responses_view).toBe(true);
    expect(p.analytics_view).toBe(true);
  });

  it("cannot manage team (key differentiator from admin)", () => {
    expect(p.team_manage).toBe(false);
  });
});

describe("ROLE_PRESETS — viewer (Leitor: read-only)", () => {
  const p = ROLE_PRESETS.viewer;

  it("can view forms", () => {
    expect(p.forms_view).toBe(true);
  });

  it("cannot create forms", () => {
    expect(p.forms_create).toBe(false);
  });

  it("cannot edit forms", () => {
    expect(p.forms_edit).toBe(false);
  });

  it("cannot publish forms", () => {
    expect(p.forms_publish).toBe(false);
  });

  it("cannot delete forms", () => {
    expect(p.forms_delete).toBe(false);
  });

  it("can view responses (read-only)", () => {
    expect(p.responses_view).toBe(true);
  });

  it("cannot export responses", () => {
    expect(p.responses_export).toBe(false);
  });

  it("can view analytics (read-only)", () => {
    expect(p.analytics_view).toBe(true);
  });

  it("cannot manage team", () => {
    expect(p.team_manage).toBe(false);
  });
});

describe("OWNER_PERMISSIONS — full access", () => {
  it("owner has all permissions enabled", () => {
    const keys = Object.keys(OWNER_PERMISSIONS) as (keyof typeof OWNER_PERMISSIONS)[];
    for (const key of keys) {
      expect(OWNER_PERMISSIONS[key]).toBe(true);
    }
  });
});

// ── resolvePermissions merging ────────────────────────────────────────────────

describe("resolvePermissions", () => {
  it("owner always returns OWNER_PERMISSIONS regardless of custom overrides", () => {
    const custom = { forms_create: false, forms_edit: false } as any;
    const result = resolvePermissions("owner", custom);
    expect(result).toEqual(OWNER_PERMISSIONS);
  });

  it("null custom returns role preset as-is", () => {
    const result = resolvePermissions("member", null);
    expect(result).toEqual(ROLE_PRESETS.member);
  });

  it("custom overrides merge on top of preset", () => {
    const result = resolvePermissions("viewer", { forms_create: true } as any);
    expect(result.forms_create).toBe(true);
    expect(result.forms_edit).toBe(false); // preset value kept
  });

  it("custom can revoke permissions below preset", () => {
    const result = resolvePermissions("member", { forms_delete: false } as any);
    expect(result.forms_delete).toBe(false);
    expect(result.forms_create).toBe(true); // untouched
  });

  it("unknown role falls back to viewer preset", () => {
    const result = resolvePermissions("unknown_role" as WorkspaceRole, null);
    expect(result).toEqual(ROLE_PRESETS.viewer);
  });
});

// ── Permission helper functions ───────────────────────────────────────────────

describe("permission helper functions", () => {
  it("canManageTeam: admin=true, member=false, viewer=false", () => {
    expect(canManageTeam(ROLE_PRESETS.admin)).toBe(true);
    expect(canManageTeam(ROLE_PRESETS.member)).toBe(false);
    expect(canManageTeam(ROLE_PRESETS.viewer)).toBe(false);
    expect(canManageTeam(OWNER_PERMISSIONS)).toBe(true);
  });

  it("canEditForms: admin=true, member=true, viewer=false", () => {
    expect(canEditForms(ROLE_PRESETS.admin)).toBe(true);
    expect(canEditForms(ROLE_PRESETS.member)).toBe(true);
    expect(canEditForms(ROLE_PRESETS.viewer)).toBe(false);
  });

  it("canCreateForms: admin=true, member=true, viewer=false", () => {
    expect(canCreateForms(ROLE_PRESETS.admin)).toBe(true);
    expect(canCreateForms(ROLE_PRESETS.member)).toBe(true);
    expect(canCreateForms(ROLE_PRESETS.viewer)).toBe(false);
  });

  it("canDeleteForms: admin=true, member=true, viewer=false", () => {
    expect(canDeleteForms(ROLE_PRESETS.admin)).toBe(true);
    expect(canDeleteForms(ROLE_PRESETS.member)).toBe(true);
    expect(canDeleteForms(ROLE_PRESETS.viewer)).toBe(false);
  });

  it("canViewResponses: all roles=true", () => {
    expect(canViewResponses(ROLE_PRESETS.admin)).toBe(true);
    expect(canViewResponses(ROLE_PRESETS.member)).toBe(true);
    expect(canViewResponses(ROLE_PRESETS.viewer)).toBe(true);
  });

  it("canExportResponses: admin=true, member=true, viewer=false", () => {
    expect(canExportResponses(ROLE_PRESETS.admin)).toBe(true);
    expect(canExportResponses(ROLE_PRESETS.member)).toBe(true);
    expect(canExportResponses(ROLE_PRESETS.viewer)).toBe(false);
  });

  it("canViewAnalytics: all roles=true", () => {
    expect(canViewAnalytics(ROLE_PRESETS.admin)).toBe(true);
    expect(canViewAnalytics(ROLE_PRESETS.member)).toBe(true);
    expect(canViewAnalytics(ROLE_PRESETS.viewer)).toBe(true);
  });
});

// ── Role hierarchy consistency ────────────────────────────────────────────────

describe("role hierarchy consistency", () => {
  it("every permission member has, admin also has", () => {
    const m = ROLE_PRESETS.member;
    const a = ROLE_PRESETS.admin;
    for (const key of Object.keys(m) as (keyof typeof m)[]) {
      if (m[key]) expect(a[key]).toBe(true);
    }
  });

  it("every permission viewer has, member also has", () => {
    const v = ROLE_PRESETS.viewer;
    const m = ROLE_PRESETS.member;
    for (const key of Object.keys(v) as (keyof typeof v)[]) {
      if (v[key]) expect(m[key]).toBe(true);
    }
  });

  it("admin has exactly one more permission than member (team_manage)", () => {
    const adminKeys = Object.keys(ROLE_PRESETS.admin).filter(
      k => ROLE_PRESETS.admin[k as keyof typeof ROLE_PRESETS.admin]
    );
    const memberKeys = Object.keys(ROLE_PRESETS.member).filter(
      k => ROLE_PRESETS.member[k as keyof typeof ROLE_PRESETS.member]
    );
    const diff = adminKeys.filter(k => !memberKeys.includes(k));
    expect(diff).toEqual(["team_manage"]);
  });
});
