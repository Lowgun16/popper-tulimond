/**
 * @jest-environment node
 */

process.env.SESSION_SECRET = "test-secret-for-jest-32-characters-long";

import { signSession, verifySession, SESSION_COOKIE_NAME } from "../session";

describe("session", () => {
  const payload = { userId: "abc-123", role: "owner" as const };

  it("signs and verifies a valid session", async () => {
    const token = await signSession(payload);
    expect(typeof token).toBe("string");
    const result = await verifySession(token);
    expect(result).toMatchObject(payload);
  });

  it("returns null for a tampered token", async () => {
    const result = await verifySession("not.a.valid.token");
    expect(result).toBeNull();
  });

  it("exports SESSION_COOKIE_NAME", () => {
    expect(typeof SESSION_COOKIE_NAME).toBe("string");
    expect(SESSION_COOKIE_NAME.length).toBeGreaterThan(0);
  });
});
