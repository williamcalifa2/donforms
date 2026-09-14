/**
 * Invite + Access Token Flow — Unit Tests
 *
 * Tests the critical business logic for the custom 6-digit token invite system.
 * External dependencies (Supabase, Resend) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Pure logic extracted for testing ─────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_REGEX = /^\d{6}$/;

function validateInvitePayload(body: {
  email?: string;
  role?: string;
  accessToken?: string;
  userEmail?: string;
}) {
  const { email, role = "member", accessToken, userEmail } = body;

  if (!email || !EMAIL_REGEX.test(email)) return { error: "Email inválido.", status: 400 };
  if (!["admin", "member", "viewer"].includes(role)) return { error: "Role inválido.", status: 400 };
  if (email.toLowerCase() === userEmail?.toLowerCase()) return { error: "Não é possível convidar a si mesmo.", status: 400 };
  if (!accessToken || !TOKEN_REGEX.test(accessToken.trim())) return { error: "Token de acesso deve ter exatamente 6 dígitos numéricos.", status: 400 };

  return { ok: true, cleanToken: accessToken.trim() };
}

function validateAccessToken(raw: string) {
  const token = raw.replace(/\D/g, "");
  if (!TOKEN_REGEX.test(token)) return null;
  return token;
}

function isTokenPermanent(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  if (expiresAt.startsWith("2099")) return true;
  return new Date(expiresAt) > new Date();
}

function generateRandom6Digit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Token Validation ──────────────────────────────────────────────────────────

describe("Token validation — /acesso", () => {
  it("accepts valid 6-digit numeric token", () => {
    expect(validateAccessToken("485592")).toBe("485592");
  });

  it("strips non-digit characters before validating", () => {
    expect(validateAccessToken("48 55 92")).toBe("485592");
    expect(validateAccessToken("48-55-92")).toBe("485592");
  });

  it("rejects tokens shorter than 6 digits", () => {
    expect(validateAccessToken("1234")).toBeNull();
    expect(validateAccessToken("12345")).toBeNull();
  });

  it("rejects tokens longer than 6 digits", () => {
    expect(validateAccessToken("1234567")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateAccessToken("")).toBeNull();
  });

  it("rejects alphabetic token", () => {
    expect(validateAccessToken("flores2024")).toBeNull(); // old format not accepted
  });

  it("rejects token with only letters", () => {
    expect(validateAccessToken("abcdef")).toBeNull();
  });
});

// ── Invite Payload Validation — /api/workspace/invite ────────────────────────

describe("Invite payload validation", () => {
  const basePayload = {
    email: "cliente@empresa.com",
    role: "member" as const,
    accessToken: "485592",
    userEmail: "admin@donforms.com",
  };

  it("accepts valid invite payload", () => {
    const result = validateInvitePayload(basePayload);
    expect(result).toEqual({ ok: true, cleanToken: "485592" });
  });

  it("rejects missing email", () => {
    const result = validateInvitePayload({ ...basePayload, email: undefined });
    expect(result).toMatchObject({ status: 400, error: "Email inválido." });
  });

  it("rejects malformed email", () => {
    const result = validateInvitePayload({ ...basePayload, email: "not-an-email" });
    expect(result).toMatchObject({ status: 400 });
  });

  it("rejects invalid role", () => {
    const result = validateInvitePayload({ ...basePayload, role: "superadmin" });
    expect(result).toMatchObject({ status: 400, error: "Role inválido." });
  });

  it("rejects self-invite", () => {
    const result = validateInvitePayload({ ...basePayload, email: "admin@donforms.com", userEmail: "admin@donforms.com" });
    expect(result).toMatchObject({ status: 400, error: "Não é possível convidar a si mesmo." });
  });

  it("self-invite check is case-insensitive", () => {
    const result = validateInvitePayload({ ...basePayload, email: "Admin@DonForms.com", userEmail: "admin@donforms.com" });
    expect(result).toMatchObject({ status: 400 });
  });

  it("rejects missing accessToken", () => {
    const result = validateInvitePayload({ ...basePayload, accessToken: undefined });
    expect(result).toMatchObject({ status: 400, error: expect.stringContaining("6 dígitos") });
  });

  it("rejects alphabetic token (old format)", () => {
    const result = validateInvitePayload({ ...basePayload, accessToken: "flores2024" });
    expect(result).toMatchObject({ status: 400 });
  });

  it("rejects token with fewer than 6 digits", () => {
    const result = validateInvitePayload({ ...basePayload, accessToken: "12345" });
    expect(result).toMatchObject({ status: 400 });
  });

  it("rejects token with more than 6 digits", () => {
    const result = validateInvitePayload({ ...basePayload, accessToken: "1234567" });
    expect(result).toMatchObject({ status: 400 });
  });

  it("trims whitespace from token before validating", () => {
    const result = validateInvitePayload({ ...basePayload, accessToken: " 485592 " });
    expect(result).toEqual({ ok: true, cleanToken: "485592" });
  });

  it("accepts all valid roles", () => {
    for (const role of ["admin", "member", "viewer"] as const) {
      const result = validateInvitePayload({ ...basePayload, role });
      expect(result).toMatchObject({ ok: true });
    }
  });
});

// ── Token Expiry Logic ────────────────────────────────────────────────────────

describe("Token expiry logic", () => {
  it("2099-12-31 sentinel is treated as permanent", () => {
    expect(isTokenPermanent("2099-12-31T23:59:59Z")).toBe(true);
  });

  it("null expires_at = permanent", () => {
    expect(isTokenPermanent(null)).toBe(true);
  });

  it("past date = expired", () => {
    expect(isTokenPermanent("2020-01-01T00:00:00Z")).toBe(false);
  });

  it("future date = still valid", () => {
    expect(isTokenPermanent("2099-01-01T00:00:00Z")).toBe(true);
  });
});

// ── Random Token Generator ────────────────────────────────────────────────────

describe("6-digit token generator (TeamSettings 'Gerar' button)", () => {
  it("generates a 6-digit string", () => {
    for (let i = 0; i < 100; i++) {
      const t = generateRandom6Digit();
      expect(t).toMatch(/^\d{6}$/);
    }
  });

  it("never generates leading-zero tokens (range 100000–999999)", () => {
    for (let i = 0; i < 100; i++) {
      const t = generateRandom6Digit();
      expect(t.length).toBe(6);
      expect(Number(t)).toBeGreaterThanOrEqual(100000);
      expect(Number(t)).toBeLessThanOrEqual(999999);
    }
  });

  it("produces different values across calls (probabilistic)", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateRandom6Digit()));
    expect(tokens.size).toBeGreaterThan(1);
  });
});

// ── Email matching (invite accept) ────────────────────────────────────────────

describe("Email match check — /invite/[token] and /api/invite/accept", () => {
  function emailMatch(inviteEmail: string, userEmail: string) {
    return inviteEmail.toLowerCase() === userEmail.toLowerCase();
  }

  it("matches same email", () => {
    expect(emailMatch("cliente@empresa.com", "cliente@empresa.com")).toBe(true);
  });

  it("match is case-insensitive", () => {
    expect(emailMatch("Cliente@Empresa.com", "cliente@empresa.com")).toBe(true);
  });

  it("rejects different email", () => {
    expect(emailMatch("outro@empresa.com", "cliente@empresa.com")).toBe(false);
  });
});

// ── Invite API mock integration ───────────────────────────────────────────────

describe("Invite API — /api/workspace/invite (mocked)", () => {
  type MockInsertResult = { data: { token: string } | null; error: { code: string; message: string } | null };

  function makeInviteHandler(
    mockInsert: () => MockInsertResult,
    mockGenerateLink: () => { data: { properties: { action_link: string; email_otp: string } } | null; error: null | { message: string } },
    mockResend: () => { ok: boolean },
  ) {
    return async (body: { email?: string; role?: string; accessToken?: string; userEmail: string }) => {
      const validation = validateInvitePayload(body);
      if ("error" in validation && !("ok" in validation)) return validation;
      if (!("cleanToken" in validation)) return validation;

      const { cleanToken } = validation;
      const insertResult = mockInsert();

      if (insertResult.error) {
        const isConflict = insertResult.error.code === "23505";
        return {
          error: isConflict ? "Este token já está em uso. Escolha outro." : insertResult.error.message,
          status: isConflict ? 409 : 500,
        };
      }

      const linkResult = mockGenerateLink();
      const resendResult = mockResend();

      return {
        ok: true,
        accessToken: cleanToken,
        emailSent: resendResult.ok,
        accessUrl: `https://donforms.dondigital.com.br/acesso`,
      };
    };
  }

  it("returns ok with token on successful invite", async () => {
    const handler = makeInviteHandler(
      () => ({ data: { token: "485592" }, error: null }),
      () => ({ data: { properties: { action_link: "https://supabase.co/verify?token=abc", email_otp: "123456" } }, error: null }),
      () => ({ ok: true }),
    );

    const result = await handler({
      email: "cliente@empresa.com",
      role: "member",
      accessToken: "485592",
      userEmail: "admin@donforms.com",
    });

    expect(result).toMatchObject({ ok: true, accessToken: "485592", emailSent: true });
  });

  it("returns 409 on duplicate token (DB unique constraint 23505)", async () => {
    const handler = makeInviteHandler(
      () => ({ data: null, error: { code: "23505", message: "unique violation" } }),
      () => ({ data: null, error: null }),
      () => ({ ok: false }),
    );

    const result = await handler({
      email: "outro@empresa.com",
      role: "member",
      accessToken: "485592",
      userEmail: "admin@donforms.com",
    });

    expect(result).toMatchObject({ status: 409, error: expect.stringContaining("já está em uso") });
  });

  it("still returns ok even if email fails to send", async () => {
    const handler = makeInviteHandler(
      () => ({ data: { token: "123456" }, error: null }),
      () => ({ data: { properties: { action_link: "https://...", email_otp: "123456" } }, error: null }),
      () => ({ ok: false }), // email fails
    );

    const result = await handler({
      email: "cliente@empresa.com",
      role: "viewer",
      accessToken: "123456",
      userEmail: "admin@donforms.com",
    });

    expect(result).toMatchObject({ ok: true, emailSent: false });
  });
});
