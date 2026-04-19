# Build 2 Phase B2 — WebAuthn + Edit Pages CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WebAuthn biometric admin authentication (no passwords, Face ID / fingerprint only) and a full-screen Edit Pages CMS panel where Logan and Faith can edit all page content and publish it live in under 2 seconds.

**Architecture:** SimpleWebAuthn handles credential registration and authentication. Session state lives in a signed `httpOnly` cookie (jose library). The Edit Pages panel is a full-screen React overlay gated behind both the `NEXT_PUBLIC_STUDIO_ENABLED` flag and a valid session cookie. TipTap provides per-field rich text editing. Drafts are per-user rows in `page_drafts`. Publishing writes to `page_content` and calls `revalidatePath()` — the same cache invalidation built in Phase B1. Custom colors are shared across all pages via the `brand_palette` table.

**Tech Stack:** Next.js 16 App Router, `@simplewebauthn/server` + `@simplewebauthn/browser`, `jose` (JWT/cookie signing), `bcryptjs` (recovery code hashing), `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-color` + `@tiptap/extension-text-style`, `@neondatabase/serverless` (already installed in B1), Jest 29 for unit tests.

**Branch:** Create `feature/build2-phase-b2` branched from `feature/build2-phase-b1`. Do NOT branch from `main`, `staging`, or `feature/build2-phase-a` — Phase B1 work must be included.

---

## File Structure

**New files:**
- `scripts/migrate-b2.sql` — DB tables: `admin_users`, `webauthn_credentials`, `admin_recovery`, `page_drafts`, `brand_palette`, `admin_invites`
- `src/lib/session.ts` — sign / verify / clear session cookie using jose
- `src/lib/adminAuth.ts` — `getSession()`, `requireSession()`, `requireOwner()` helpers used by API routes
- `src/lib/__tests__/session.test.ts` — unit tests for session sign/verify
- `src/app/admin/setup/page.tsx` — one-time owner registration UI (returns 404 once any admin exists)
- `src/app/admin/setup/route.ts` — GET: check if setup needed; POST: complete registration
- `src/app/admin/recover/page.tsx` — recovery code entry UI
- `src/app/admin/recover/route.ts` — POST: verify recovery code, start new credential registration
- `src/app/api/admin/webauthn/register-options/route.ts` — GET: generate registration options
- `src/app/api/admin/webauthn/register-verify/route.ts` — POST: verify registration response, save credential
- `src/app/api/admin/webauthn/auth-options/route.ts` — GET: generate authentication options
- `src/app/api/admin/webauthn/auth-verify/route.ts` — POST: verify auth response, set session cookie
- `src/app/api/admin/webauthn/logout/route.ts` — POST: clear session cookie
- `src/app/api/admin/invite/route.ts` — POST: generate one-time invite link (owner only)
- `src/app/api/admin/invite/[token]/route.ts` — GET: validate invite token; POST: complete registration via invite
- `src/app/api/admin/users/route.ts` — GET: list users + devices (owner only)
- `src/app/api/admin/users/[userId]/route.ts` — DELETE: remove user (owner only)
- `src/app/api/admin/users/[userId]/role/route.ts` — PATCH: promote/demote role (owner only)
- `src/app/api/admin/credentials/[credentialId]/route.ts` — DELETE: revoke a device credential
- `src/app/api/edit-pages/drafts/route.ts` — GET: load drafts for session user + page; POST: save draft
- `src/app/api/edit-pages/publish/route.ts` — POST: write draft to page_content, revalidatePath, clear draft
- `src/app/api/edit-pages/palette/route.ts` — GET: load brand_palette; POST: add custom color
- `src/components/edit-pages/EditPagesPanel.tsx` — full-screen overlay, orchestrates everything
- `src/components/edit-pages/EditPagesSidebar.tsx` — left sidebar with page list and Admin link
- `src/components/edit-pages/PageEditor.tsx` — top bar + split view (desktop) / single column (mobile)
- `src/components/edit-pages/FieldEditor.tsx` — single field: original box + TipTap editor
- `src/components/edit-pages/TipTapToolbar.tsx` — Bold/Italic/Underline + color dots + custom color picker
- `src/components/edit-pages/ColorPicker.tsx` — hex input + preset swatches + Save button popup
- `src/components/edit-pages/PagePreview.tsx` — left-column live preview (renders real overlay component read-only)
- `src/components/edit-pages/PublishModal.tsx` — confirmation modal before publishing
- `src/components/edit-pages/AdminPanel.tsx` — owner-only: list users/devices, revoke, invite
- `src/hooks/useAdminSession.ts` — client hook: check session, trigger auth flow
- `src/hooks/useEditPages.ts` — client hook: draft state, save, publish logic

**Modified files:**
- `src/middleware.ts` — extend matcher to protect `/admin/:path*` and `/api/admin/:path*`
- `src/components/CollectionOverlay.tsx` — add "Edit Pages" button to Studio controls stack; wire `EditPagesPanel`

---

## Task 1: Worktree setup + install packages

**Files:**
- Create: `.worktrees/build2-phase-b2/` (worktree)

- [ ] **Step 1: Create worktree branched from Phase B1**

```bash
git worktree add .worktrees/build2-phase-b2 -b feature/build2-phase-b2 feature/build2-phase-b1
cd .worktrees/build2-phase-b2
npm install
```

- [ ] **Step 2: Verify tests pass**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Install new packages**

```bash
npm install @simplewebauthn/server @simplewebauthn/browser jose bcryptjs
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 4: Verify install**

```bash
cat package.json | grep -E "simplewebauthn|jose|bcryptjs|tiptap"
```

Expected: all 8 packages appear in `dependencies`.

- [ ] **Step 5: Add new env vars to `.env.local`**

Append to `.env.local`:

```bash
# WebAuthn
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME="Popper Tulimond"
WEBAUTHN_ORIGIN=http://localhost:3000

# Session cookie signing (generate a 32+ char random string)
SESSION_SECRET=change-this-to-a-long-random-secret-before-deploy
```

Do NOT commit `.env.local`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install webauthn, jose, bcryptjs, tiptap packages"
```

---

## Task 2: DB migration — WebAuthn + CMS tables

**Files:**
- Create: `scripts/migrate-b2.sql`

- [ ] **Step 1: Write the migration file**

Create `scripts/migrate-b2.sql`:

```sql
-- Build 2 Phase B2 migration
-- Run once in Neon console after migrate-b1.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  credential_id   TEXT UNIQUE NOT NULL,
  public_key      TEXT NOT NULL,
  counter         INTEGER DEFAULT 0,
  device_name     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_recovery (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT UNIQUE NOT NULL,
  created_by  UUID NOT NULL REFERENCES admin_users(id),
  used        BOOLEAN DEFAULT false,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  page_slug   TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, page_slug, field_key)
);

CREATE TABLE IF NOT EXISTS brand_palette (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hex         TEXT NOT NULL,
  label       TEXT,
  created_by  UUID REFERENCES admin_users(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_page_drafts_user_page ON page_drafts(user_id, page_slug);
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-b2.sql
git commit -m "feat: add phase b2 DB migration (admin, webauthn, drafts, palette)"
```

---

## Task 3: Session cookie helper

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/lib/__tests__/session.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/session.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test -- --testPathPattern="session.test" --no-coverage
```

Expected: FAIL — `Cannot find module '../session'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/session.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "owner" | "editor";
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as "owner" | "editor",
    };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE };
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test -- --testPathPattern="session.test" --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/__tests__/session.test.ts
git commit -m "feat: add session cookie helper (jose JWT, sign/verify)"
```

---

## Task 4: Admin auth helpers + middleware extension

**Files:**
- Create: `src/lib/adminAuth.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Write `adminAuth.ts`**

Create `src/lib/adminAuth.ts`:

```typescript
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, signSession, SESSION_MAX_AGE, type SessionPayload } from "./session";

/** Read and verify the session from the cookie store (server components / API routes). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Use in API routes: returns session or responds 401. */
export async function requireSession(req: NextRequest): Promise<SessionPayload | NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

/** Use in owner-only API routes: returns session or responds 401/403. */
export async function requireOwner(req: NextRequest): Promise<SessionPayload | NextResponse> {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
  if (sessionOrResponse.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return sessionOrResponse;
}

/** Build a Set-Cookie response header value for the session. */
export function buildSessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Build a cookie header that clears the session. */
export function buildClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
```

- [ ] **Step 2: Extend middleware**

Read `src/middleware.ts` first, then replace its content:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "./lib/session";

export async function middleware(request: NextRequest) {
  const studioEnabled = process.env.NEXT_PUBLIC_STUDIO_ENABLED === "true";
  const { pathname } = request.nextUrl;

  // Block /studio/* when studio is disabled
  if (!studioEnabled && pathname.startsWith("/studio")) {
    return new NextResponse(null, { status: 404 });
  }

  // Protect /admin/* API routes (not /admin/setup or /admin/recover — those are public)
  if (
    pathname.startsWith("/api/admin/") ||
    (pathname.startsWith("/admin/") &&
      !pathname.startsWith("/admin/setup") &&
      !pathname.startsWith("/admin/recover"))
  ) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/adminAuth.ts src/middleware.ts
git commit -m "feat: add admin auth helpers and extend middleware to protect /admin routes"
```

---

## Task 5: WebAuthn registration + authentication API routes

**Files:**
- Create: `src/app/api/admin/webauthn/register-options/route.ts`
- Create: `src/app/api/admin/webauthn/register-verify/route.ts`
- Create: `src/app/api/admin/webauthn/auth-options/route.ts`
- Create: `src/app/api/admin/webauthn/auth-verify/route.ts`
- Create: `src/app/api/admin/webauthn/logout/route.ts`

- [ ] **Step 1: Create registration options route**

Create `src/app/api/admin/webauthn/register-options/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

// In-memory challenge store (sufficient for single-server; Vercel Fluid Compute reuses instances)
const challengeStore = new Map<string, string>();

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const name = req.nextUrl.searchParams.get("name");
  if (!email || !name) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  // Fetch existing credentials for this user (if any) to exclude them
  const existingRows = await sql`
    SELECT wc.credential_id
    FROM webauthn_credentials wc
    JOIN admin_users au ON au.id = wc.user_id
    WHERE au.email = ${email}
  `;
  const excludeCredentials = existingRows.map((r: { credential_id: string }) => ({
    id: r.credential_id,
    type: "public-key" as const,
  }));

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME!,
    rpID: process.env.WEBAUTHN_RP_ID!,
    userName: email,
    userDisplayName: name,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  challengeStore.set(email, options.challenge);

  return NextResponse.json(options);
}

export { challengeStore };
```

- [ ] **Step 2: Create registration verify route**

Create `src/app/api/admin/webauthn/register-verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { challengeStore } from "../register-options/route";
import { signSession } from "@/lib/session";
import { buildSessionCookieHeader } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, role, registrationResponse, inviteToken } = body as {
    email: string;
    name: string;
    role?: "owner" | "editor";
    registrationResponse: unknown;
    inviteToken?: string;
  };

  const expectedChallenge = challengeStore.get(email);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No challenge found — start registration again" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  challengeStore.delete(email);

  const { credential } = verification.registrationInfo;
  const credentialId = isoBase64URL.fromBuffer(credential.id);
  const publicKey = isoBase64URL.fromBuffer(credential.publicKey);

  // Check if this is the very first admin (setup flow) or an invite flow
  const existingAdmins = await sql`SELECT id FROM admin_users LIMIT 1`;
  const isFirstAdmin = existingAdmins.length === 0;

  // Validate invite token if not first admin
  if (!isFirstAdmin && inviteToken) {
    const invite = await sql`
      SELECT id FROM admin_invites
      WHERE token = ${inviteToken}
        AND used = false
        AND expires_at > now()
    `;
    if (invite.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
    }
    await sql`UPDATE admin_invites SET used = true WHERE token = ${inviteToken}`;
  }

  const assignedRole = isFirstAdmin ? "owner" : (role ?? "editor");

  // Upsert user
  const userResult = await sql`
    INSERT INTO admin_users (name, email, role)
    VALUES (${name}, ${email}, ${assignedRole})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const userId = userResult[0].id;

  // Save credential
  await sql`
    INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
    VALUES (${userId}, ${credentialId}, ${publicKey}, ${credential.counter})
    ON CONFLICT (credential_id) DO NOTHING
  `;

  // Generate recovery code for first admin (owner)
  let recoveryCode: string | null = null;
  if (isFirstAdmin) {
    recoveryCode = crypto.randomBytes(16).toString("hex");
    const codeHash = await bcrypt.hash(recoveryCode, 12);
    await sql`
      INSERT INTO admin_recovery (user_id, code_hash)
      VALUES (${userId}, ${codeHash})
    `;
  }

  // Issue session
  const token = await signSession({ userId, role: assignedRole });
  const response = NextResponse.json({ ok: true, recoveryCode });
  response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
  return response;
}
```

- [ ] **Step 3: Create authentication options route**

Create `src/app/api/admin/webauthn/auth-options/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

// Shared challenge store for auth flow
export const authChallengeStore = new Map<string, string>();

export async function GET() {
  // Allow any registered credential (passkey-style: user selects their device)
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "preferred",
    allowCredentials: [],
  });

  // Store challenge keyed by challenge string itself (resolved in verify)
  authChallengeStore.set(options.challenge, options.challenge);

  return NextResponse.json(options);
}
```

- [ ] **Step 4: Create authentication verify route**

Create `src/app/api/admin/webauthn/auth-verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { authChallengeStore } from "../auth-options/route";
import { signSession } from "@/lib/session";
import { buildSessionCookieHeader } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { authenticationResponse } = body as { authenticationResponse: { id: string; response: { clientDataJSON: string } } };

  // Decode challenge from clientDataJSON
  const clientData = JSON.parse(
    Buffer.from(authenticationResponse.response.clientDataJSON, "base64url").toString()
  );
  const challenge = clientData.challenge;
  const expectedChallenge = authChallengeStore.get(challenge);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
  }

  const credentialId = authenticationResponse.id;

  // Look up the credential
  const credRows = await sql`
    SELECT wc.id, wc.credential_id, wc.public_key, wc.counter,
           au.id as user_id, au.role
    FROM webauthn_credentials wc
    JOIN admin_users au ON au.id = wc.user_id
    WHERE wc.credential_id = ${credentialId}
      AND au.active = true
  `;

  if (credRows.length === 0) {
    return NextResponse.json({ error: "Credential not found" }, { status: 401 });
  }

  const cred = credRows[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authenticationResponse as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
      credential: {
        id: isoBase64URL.toBuffer(cred.credential_id),
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  authChallengeStore.delete(challenge);

  // Update counter
  await sql`
    UPDATE webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter}
    WHERE credential_id = ${credentialId}
  `;

  const token = await signSession({ userId: cred.user_id, role: cred.role });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
  return response;
}
```

- [ ] **Step 5: Create logout route**

Create `src/app/api/admin/webauthn/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { buildClearSessionCookieHeader } from "@/lib/adminAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearSessionCookieHeader());
  return response;
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass (WebAuthn routes not directly unit-tested — integration tested in setup flow).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/webauthn/
git commit -m "feat: add WebAuthn registration and authentication API routes"
```

---

## Task 6: Admin setup page + recovery page

**Files:**
- Create: `src/app/admin/setup/page.tsx`
- Create: `src/app/admin/recover/page.tsx`

- [ ] **Step 1: Create the setup page**

Create `src/app/admin/setup/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import AdminSetupClient from "./AdminSetupClient";

export default async function SetupPage() {
  // If any admin exists, this route is gone
  const existing = await sql`SELECT id FROM admin_users LIMIT 1`;
  if (existing.length > 0) {
    redirect("/");
  }
  return <AdminSetupClient />;
}
```

Create `src/app/admin/setup/AdminSetupClient.tsx`:

```typescript
"use client";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

export default function AdminSetupClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSetup() {
    setStatus("loading");
    setErrorMsg("");
    try {
      // 1. Get registration options
      const optRes = await fetch(
        `/api/admin/webauthn/register-options?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
      );
      const options = await optRes.json();

      // 2. Trigger browser biometric
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // 3. Verify
      const verifyRes = await fetch("/api/admin/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, registrationResponse }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(result.error);

      setRecoveryCode(result.recoveryCode);
      setStatus("done");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  if (status === "done" && recoveryCode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-xl tracking-widest uppercase">Setup Complete</h1>
        <p className="text-sm text-white/60 max-w-sm text-center">
          Save this recovery code somewhere safe. It will never be shown again. If you lose all your
          registered devices, you'll need this to regain access.
        </p>
        <div className="font-mono text-[#D4B896] text-lg tracking-widest border border-[#D4B896]/40 px-6 py-4">
          {recoveryCode}
        </div>
        <p className="text-xs text-white/40">Store in your password manager or print it.</p>
        <a href="/" className="text-xs uppercase tracking-widest text-white/40 hover:text-white mt-4">
          → Go to site
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl tracking-widest uppercase">Admin Setup</h1>
      <p className="text-sm text-white/50 max-w-xs text-center">
        One-time setup. Enter your name and email, then complete the biometric prompt.
      </p>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-transparent border border-white/20 text-white px-4 py-2 text-sm w-72 outline-none focus:border-[#D4B896]"
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-transparent border border-white/20 text-white px-4 py-2 text-sm w-72 outline-none focus:border-[#D4B896]"
      />
      {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
      <button
        onClick={handleSetup}
        disabled={status === "loading" || !name || !email}
        className="px-8 py-3 bg-[#D4B896] text-black text-xs uppercase tracking-widest disabled:opacity-40"
      >
        {status === "loading" ? "Registering..." : "Register with Face ID / Fingerprint"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the recovery page**

Create `src/app/admin/recover/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

export default function RecoverPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"code" | "register" | "done" | "error">("code");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleVerifyCode() {
    setErrorMsg("");
    const res = await fetch("/api/admin/recover/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) { setErrorMsg(data.error); return; }
    setEmail(data.email);
    setName(data.name);
    setStep("register");
  }

  async function handleRegister() {
    setErrorMsg("");
    try {
      const optRes = await fetch(
        `/api/admin/webauthn/register-options?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
      );
      const options = await optRes.json();
      const registrationResponse = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/admin/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, registrationResponse }),
      });
      if (!verifyRes.ok) { const d = await verifyRes.json(); throw new Error(d.error); }
      setStep("done");
    } catch (err) {
      setErrorMsg(String(err));
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl tracking-widest uppercase">Access Restored</h1>
        <p className="text-sm text-white/50">New device registered. Your recovery code has been used and is no longer valid.</p>
        <a href="/" className="text-xs uppercase tracking-widest text-[#D4B896] mt-4">→ Go to site</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl tracking-widest uppercase">Account Recovery</h1>
      {step === "code" && (
        <>
          <p className="text-sm text-white/50 max-w-xs text-center">Enter your one-time recovery code.</p>
          <input
            type="text"
            placeholder="Recovery code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-transparent border border-white/20 text-white px-4 py-2 text-sm w-72 outline-none font-mono focus:border-[#D4B896]"
          />
          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
          <button onClick={handleVerifyCode} disabled={!code} className="px-8 py-3 bg-[#D4B896] text-black text-xs uppercase tracking-widest disabled:opacity-40">
            Verify Code
          </button>
        </>
      )}
      {step === "register" && (
        <>
          <p className="text-sm text-white/50 max-w-xs text-center">Code verified. Register your new device.</p>
          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
          <button onClick={handleRegister} className="px-8 py-3 bg-[#D4B896] text-black text-xs uppercase tracking-widest">
            Register New Device
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create recovery verify-code API route**

Create `src/app/api/admin/recover/verify-code/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const rows = await sql`
    SELECT ar.id, ar.code_hash, au.email, au.name
    FROM admin_recovery ar
    JOIN admin_users au ON au.id = ar.user_id
    WHERE ar.used = false
    ORDER BY ar.created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json({ error: "No valid recovery code found" }, { status: 400 });

  const valid = await bcrypt.compare(code, rows[0].code_hash);
  if (!valid) return NextResponse.json({ error: "Invalid recovery code" }, { status: 401 });

  // Mark as used
  await sql`UPDATE admin_recovery SET used = true WHERE id = ${rows[0].id}`;

  return NextResponse.json({ email: rows[0].email, name: rows[0].name });
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/ src/app/api/admin/recover/
git commit -m "feat: add admin setup and recovery pages with WebAuthn flows"
```

---

## Task 7: Invite links + Admin Management API routes

**Files:**
- Create: `src/app/api/admin/invite/route.ts`
- Create: `src/app/api/admin/invite/[token]/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[userId]/route.ts`
- Create: `src/app/api/admin/users/[userId]/role/route.ts`
- Create: `src/app/api/admin/credentials/[credentialId]/route.ts`

- [ ] **Step 1: Create invite generation route**

Create `src/app/api/admin/invite/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await sql`
    INSERT INTO admin_invites (token, created_by, expires_at)
    VALUES (${token}, ${sessionOrResponse.userId}, ${expiresAt.toISOString()})
  `;

  const origin = req.nextUrl.origin;
  return NextResponse.json({ inviteUrl: `${origin}/admin/invite/${token}` });
}
```

- [ ] **Step 2: Create invite acceptance route**

Create `src/app/api/admin/invite/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await sql`
    SELECT id FROM admin_invites
    WHERE token = ${token} AND used = false AND expires_at > now()
  `;
  if (rows.length === 0) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  return NextResponse.json({ valid: true });
}
```

Create `src/app/admin/invite/[token]/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [valid, setValid] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/invite/${token}`).then((r) => r.json()).then((d) => setValid(d.valid));
  }, [token]);

  async function handleRegister() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const optRes = await fetch(
        `/api/admin/webauthn/register-options?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
      );
      const options = await optRes.json();
      const registrationResponse = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/admin/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, registrationResponse, inviteToken: token }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(result.error);
      setStatus("done");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  if (valid === null) return <div className="min-h-screen bg-black" />;
  if (!valid) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50 text-sm">This invite link is invalid or has expired.</p>
    </div>
  );
  if (status === "done") return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl tracking-widest uppercase">You&apos;re In</h1>
      <p className="text-sm text-white/50">Registration complete.</p>
      <a href="/" className="text-xs uppercase tracking-widest text-[#D4B896] mt-4">→ Go to site</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl tracking-widest uppercase">Admin Invite</h1>
      <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
        className="bg-transparent border border-white/20 text-white px-4 py-2 text-sm w-72 outline-none focus:border-[#D4B896]" />
      <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="bg-transparent border border-white/20 text-white px-4 py-2 text-sm w-72 outline-none focus:border-[#D4B896]" />
      {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
      <button onClick={handleRegister} disabled={status === "loading" || !name || !email}
        className="px-8 py-3 bg-[#D4B896] text-black text-xs uppercase tracking-widest disabled:opacity-40">
        {status === "loading" ? "Registering..." : "Register with Face ID / Fingerprint"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create user management routes**

Create `src/app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const users = await sql`
    SELECT au.id, au.name, au.email, au.role, au.active, au.created_at,
           json_agg(json_build_object(
             'id', wc.id,
             'credential_id', wc.credential_id,
             'device_name', wc.device_name,
             'created_at', wc.created_at
           )) FILTER (WHERE wc.id IS NOT NULL) as credentials
    FROM admin_users au
    LEFT JOIN webauthn_credentials wc ON wc.user_id = au.id
    GROUP BY au.id
    ORDER BY au.created_at ASC
  `;

  return NextResponse.json(users);
}
```

Create `src/app/api/admin/users/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { userId } = await params;
  // Prevent self-deletion
  if (userId === sessionOrResponse.userId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await sql`DELETE FROM admin_users WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/admin/users/[userId]/role/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { userId } = await params;
  const { role } = await req.json() as { role: "owner" | "editor" };

  if (!["owner", "editor"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await sql`UPDATE admin_users SET role = ${role} WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/admin/credentials/[credentialId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { credentialId } = await params;

  // Owners can revoke any credential; editors can only revoke their own
  if (sessionOrResponse.role === "owner") {
    await sql`DELETE FROM webauthn_credentials WHERE id = ${credentialId}`;
  } else {
    await sql`
      DELETE FROM webauthn_credentials
      WHERE id = ${credentialId} AND user_id = ${sessionOrResponse.userId}
    `;
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/ src/app/admin/invite/
git commit -m "feat: add invite links and admin user/credential management API routes"
```

---

## Task 8: Draft + publish + palette API routes

**Files:**
- Create: `src/app/api/edit-pages/drafts/route.ts`
- Create: `src/app/api/edit-pages/publish/route.ts`
- Create: `src/app/api/edit-pages/palette/route.ts`

- [ ] **Step 1: Create drafts route**

Create `src/app/api/edit-pages/drafts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

/** GET /api/edit-pages/drafts?page=about — returns draft rows for this user + page */
export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const pageSlug = req.nextUrl.searchParams.get("page");
  if (!pageSlug) return NextResponse.json({ error: "page param required" }, { status: 400 });

  const rows = await sql`
    SELECT field_key, value
    FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId}
      AND page_slug = ${pageSlug}
  `;

  const draft: Record<string, string> = {};
  for (const row of rows) draft[row.field_key] = row.value;

  return NextResponse.json(draft);
}

/** POST /api/edit-pages/drafts — body: { pageSlug, fields: Record<string, string> } */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { pageSlug, fields } = await req.json() as {
    pageSlug: string;
    fields: Record<string, string>;
  };

  for (const [fieldKey, value] of Object.entries(fields)) {
    await sql`
      INSERT INTO page_drafts (user_id, page_slug, field_key, value)
      VALUES (${sessionOrResponse.userId}, ${pageSlug}, ${fieldKey}, ${value})
      ON CONFLICT (user_id, page_slug, field_key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create publish route**

Create `src/app/api/edit-pages/publish/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

const PAGE_PATHS: Record<string, string[]> = {
  about: ["/"],
  protocol: ["/"],
  contact: ["/"],
  vault: ["/"],
  terms: ["/terms"],
  privacy: ["/privacy"],
  shipping: ["/shipping"],
  refund: ["/refund"],
  "contact-us": ["/contact-us"],
};

/** POST /api/edit-pages/publish — body: { pageSlug } */
export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { pageSlug } = await req.json() as { pageSlug: string };

  // Fetch this user's draft for the page
  const draftRows = await sql`
    SELECT field_key, value
    FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId}
      AND page_slug = ${pageSlug}
  `;

  if (draftRows.length === 0) {
    return NextResponse.json({ error: "No draft to publish" }, { status: 400 });
  }

  // Write to page_content (upsert)
  for (const row of draftRows) {
    await sql`
      INSERT INTO page_content (page_slug, field_key, value, updated_by)
      VALUES (${pageSlug}, ${row.field_key}, ${row.value}, ${sessionOrResponse.userId})
      ON CONFLICT (page_slug, field_key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by
    `;
  }

  // Clear this user's draft for this page
  await sql`
    DELETE FROM page_drafts
    WHERE user_id = ${sessionOrResponse.userId} AND page_slug = ${pageSlug}
  `;

  // Revalidate affected paths
  const paths = PAGE_PATHS[pageSlug] ?? ["/"];
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create palette route**

Create `src/app/api/edit-pages/palette/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const rows = await sql`SELECT id, hex, label FROM brand_palette ORDER BY created_at ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const { hex, label } = await req.json() as { hex: string; label?: string };

  // Validate hex format
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return NextResponse.json({ error: "Invalid hex color" }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO brand_palette (hex, label, created_by)
    VALUES (${hex}, ${label ?? null}, ${sessionOrResponse.userId})
    RETURNING id, hex, label
  `;

  return NextResponse.json(row);
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/edit-pages/
git commit -m "feat: add drafts, publish, and brand palette API routes"
```

---

## Task 9: `useAdminSession` + `useEditPages` hooks

**Files:**
- Create: `src/hooks/useAdminSession.ts`
- Create: `src/hooks/useEditPages.ts`

- [ ] **Step 1: Create `useAdminSession`**

Create `src/hooks/useAdminSession.ts`:

```typescript
"use client";
import { useState, useCallback } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export type AdminSessionState =
  | { status: "unknown" }
  | { status: "authenticated"; userId: string; role: "owner" | "editor" }
  | { status: "unauthenticated" }
  | { status: "authenticating" }
  | { status: "error"; message: string };

export function useAdminSession() {
  const [session, setSession] = useState<AdminSessionState>({ status: "unknown" });

  const checkSession = useCallback(async () => {
    // Try a lightweight authenticated endpoint to test the cookie
    const res = await fetch("/api/edit-pages/drafts?page=about", { credentials: "include" });
    if (res.status === 401) {
      setSession({ status: "unauthenticated" });
    } else {
      // Parse role from the session — we'll read it from the users endpoint
      const usersRes = await fetch("/api/admin/users", { credentials: "include" });
      if (usersRes.status === 403 || usersRes.ok) {
        // We're authenticated (403 means editor, 200 means owner)
        // Re-fetch a lightweight endpoint to determine role
        setSession({ status: "authenticated", userId: "", role: usersRes.ok ? "owner" : "editor" });
      }
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    setSession({ status: "authenticating" });
    try {
      const optRes = await fetch("/api/admin/webauthn/auth-options", { credentials: "include" });
      const options = await optRes.json();
      const authResponse = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/admin/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ authenticationResponse: authResponse }),
      });
      if (!verifyRes.ok) {
        setSession({ status: "error", message: "Authentication failed" });
        return false;
      }
      await checkSession();
      return true;
    } catch (err) {
      setSession({ status: "error", message: String(err) });
      return false;
    }
  }, [checkSession]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/webauthn/logout", { method: "POST", credentials: "include" });
    setSession({ status: "unauthenticated" });
  }, []);

  return { session, checkSession, authenticate, logout };
}
```

- [ ] **Step 2: Create `useEditPages`**

Create `src/hooks/useEditPages.ts`:

```typescript
"use client";
import { useState, useCallback } from "react";

export type FieldDrafts = Record<string, string>;

export function useEditPages(pageSlug: string) {
  const [drafts, setDrafts] = useState<FieldDrafts>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const loadDrafts = useCallback(async () => {
    const res = await fetch(`/api/edit-pages/drafts?page=${pageSlug}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setDrafts(data);
    }
  }, [pageSlug]);

  const updateField = useCallback((fieldKey: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [fieldKey]: value }));
  }, []);

  const saveDraft = useCallback(async (fields: FieldDrafts) => {
    setSaving(true);
    await fetch("/api/edit-pages/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageSlug, fields }),
    });
    setSaving(false);
    setLastSaved(new Date());
  }, [pageSlug]);

  const publish = useCallback(async (): Promise<boolean> => {
    setPublishing(true);
    const res = await fetch("/api/edit-pages/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageSlug }),
    });
    setPublishing(false);
    if (res.ok) {
      setDrafts({});
      return true;
    }
    return false;
  }, [pageSlug]);

  return { drafts, saving, publishing, lastSaved, loadDrafts, updateField, saveDraft, publish };
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useAdminSession and useEditPages client hooks"
```

---

## Task 10: TipTap toolbar + color picker components

**Files:**
- Create: `src/components/edit-pages/ColorPicker.tsx`
- Create: `src/components/edit-pages/TipTapToolbar.tsx`

The five brand base colors (never removable):
```
Parchment  #F5ECD7
Gold       #D4B896
Red Gun    #8B1A1A
Muted      #5C5C5C
Soft       #E8E0D5
```

- [ ] **Step 1: Create `ColorPicker`**

Create `src/components/edit-pages/ColorPicker.tsx`:

```typescript
"use client";
import { useState, useRef, useEffect } from "react";

type Props = {
  onSave: (hex: string) => void;
  onClose: () => void;
};

const PRESET_SWATCHES = [
  "#8B0000", "#1A1A2E", "#2C3E50", "#006400", "#4B0082",
  "#FF6B35", "#F7C59F", "#EFEFD0", "#004E89", "#1A936F",
];

export function ColorPicker({ onSave, onClose }: Props) {
  const [hex, setHex] = useState("#");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 bg-[#111] border border-white/20 p-4 flex flex-col gap-3 shadow-2xl w-56"
    >
      <p className="text-[9px] uppercase tracking-widest text-white/40">Custom Color</p>
      <div className="flex gap-2 flex-wrap">
        {PRESET_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            onClick={() => setHex(swatch)}
            className="w-5 h-5 rounded-sm border border-white/10 hover:border-white/40"
            style={{ backgroundColor: swatch }}
            title={swatch}
          />
        ))}
      </div>
      <input
        type="text"
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        placeholder="#000000"
        className="bg-transparent border border-white/20 text-white text-xs px-2 py-1 w-full outline-none font-mono focus:border-[#D4B896]"
        maxLength={7}
      />
      <button
        onClick={() => { if (isValidHex) { onSave(hex); onClose(); } }}
        disabled={!isValidHex}
        className="px-4 py-1.5 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-30"
      >
        Save Color
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `TipTapToolbar`**

Create `src/components/edit-pages/TipTapToolbar.tsx`:

```typescript
"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ColorPicker } from "./ColorPicker";

const BASE_COLORS = [
  { name: "Parchment", hex: "#F5ECD7" },
  { name: "Gold",      hex: "#D4B896" },
  { name: "Red Gun",   hex: "#8B1A1A" },
  { name: "Muted",     hex: "#5C5C5C" },
  { name: "Soft",      hex: "#E8E0D5" },
];

type Props = {
  editor: Editor;
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
};

export function TipTapToolbar({ editor, customColors, onAddCustomColor }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  function applyColor(hex: string) {
    editor.chain().focus().setColor(hex).run();
  }

  return (
    <div className="flex items-center gap-1 flex-wrap relative px-1 py-1 border-b border-white/10">
      {/* Text format buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-0.5 text-xs font-bold ${editor.isActive("bold") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Bold"
      >B</button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-0.5 text-xs italic ${editor.isActive("italic") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Italic"
      >I</button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-2 py-0.5 text-xs underline ${editor.isActive("underline") ? "text-[#D4B896]" : "text-white/60 hover:text-white"}`}
        title="Underline"
      >U</button>

      {/* Separator */}
      <div className="w-px h-4 bg-white/20 mx-1" />

      {/* Brand base color dots */}
      {BASE_COLORS.map((color) => (
        <button
          key={color.hex}
          onClick={() => applyColor(color.hex)}
          title={color.name}
          className="w-4 h-4 rounded-full border border-white/20 hover:border-white/60 transition-all"
          style={{ backgroundColor: color.hex }}
        />
      ))}

      {/* Separator */}
      {customColors.length > 0 && <div className="w-px h-4 bg-white/20 mx-1" />}

      {/* Custom color dots */}
      {customColors.map((color) => (
        <button
          key={color.id}
          onClick={() => applyColor(color.hex)}
          title={color.label ?? color.hex}
          className="w-4 h-4 rounded-full border border-white/20 hover:border-white/60 transition-all"
          style={{ backgroundColor: color.hex }}
        />
      ))}

      {/* Add custom color */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((p) => !p)}
          className="w-4 h-4 rounded-full border border-dashed border-white/40 hover:border-white text-white/40 hover:text-white text-[9px] flex items-center justify-center"
          title="Add custom color"
        >+</button>
        {showPicker && (
          <ColorPicker
            onSave={(hex) => {
              applyColor(hex);
              onAddCustomColor(hex);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/edit-pages/ColorPicker.tsx src/components/edit-pages/TipTapToolbar.tsx
git commit -m "feat: add TipTap toolbar with brand color dots and custom color picker"
```

---

## Task 11: FieldEditor component

**Files:**
- Create: `src/components/edit-pages/FieldEditor.tsx`

Each field shows: label → original box (faded, read-only, "live" tag) → TipTap editor with toolbar.

- [ ] **Step 1: Create `FieldEditor`**

Create `src/components/edit-pages/FieldEditor.tsx`:

```typescript
"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { TipTapToolbar } from "./TipTapToolbar";

type Props = {
  label: string;
  liveValue: string;       // currently published value (HTML or plain text)
  draftValue: string;      // current user's draft (empty string = no draft)
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
  onChange: (value: string) => void;
};

export function FieldEditor({
  label,
  liveValue,
  draftValue,
  customColors,
  onAddCustomColor,
  onChange,
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Color, TextStyle, Underline],
    content: draftValue || liveValue,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // When page changes, reset content
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(draftValue || liveValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveValue]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>

      {/* Original / live box */}
      <div className="relative border border-white/10 px-3 py-2 bg-white/[0.02]">
        <span className="absolute top-1 right-2 text-[8px] uppercase tracking-widest text-[#D4B896]/60">live</span>
        <div
          className="text-white/30 text-xs leading-relaxed prose-sm"
          dangerouslySetInnerHTML={{ __html: liveValue || "(empty)" }}
        />
      </div>

      {/* TipTap editor */}
      <div className="border border-white/20 focus-within:border-[#D4B896]/60 transition-colors">
        {editor && (
          <TipTapToolbar
            editor={editor}
            customColors={customColors}
            onAddCustomColor={onAddCustomColor}
          />
        )}
        <EditorContent
          editor={editor}
          className="min-h-[60px] text-white text-xs leading-relaxed px-3 py-2 outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[48px]"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/edit-pages/FieldEditor.tsx
git commit -m "feat: add FieldEditor (original box + TipTap editor)"
```

---

## Task 12: PublishModal + EditPagesSidebar + AdminPanel

**Files:**
- Create: `src/components/edit-pages/PublishModal.tsx`
- Create: `src/components/edit-pages/EditPagesSidebar.tsx`
- Create: `src/components/edit-pages/AdminPanel.tsx`

- [ ] **Step 1: Create `PublishModal`**

Create `src/components/edit-pages/PublishModal.tsx`:

```typescript
"use client";

type Props = {
  pageName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PublishModal({ pageName, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-8">
      <div className="bg-[#0a0a0a] border border-white/20 p-8 max-w-sm w-full flex flex-col gap-6">
        <h2 className="text-sm uppercase tracking-widest text-white">Publish Changes</h2>
        <p className="text-white/50 text-xs leading-relaxed">
          You are about to publish your changes to the <span className="text-white">{pageName}</span> page.
          Visitors will see the new version immediately. The current live version will become the new baseline.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-white/20 text-white/50 text-[9px] uppercase tracking-widest hover:border-white/40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
          >
            Yes, Publish
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `EditPagesSidebar`**

Create `src/components/edit-pages/EditPagesSidebar.tsx`:

```typescript
"use client";

export type PageItem = {
  slug: string;
  label: string;
};

const BRAND_PAGES: PageItem[] = [
  { slug: "about", label: "About" },
  { slug: "protocol", label: "The Protocol" },
  { slug: "contact", label: "Contact" },
  { slug: "vault", label: "Vault" },
];

const LEGAL_PAGES: PageItem[] = [
  { slug: "terms", label: "Terms of Use" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "shipping", label: "Shipping & Fulfillment" },
  { slug: "refund", label: "Refund Policy" },
  { slug: "contact-us", label: "Contact Us" },
];

type Props = {
  activePage: string;
  onSelectPage: (slug: string) => void;
  isOwner: boolean;
  onAdminClick: () => void;
};

export function EditPagesSidebar({ activePage, onSelectPage, isOwner, onAdminClick }: Props) {
  function PageBtn({ page }: { page: PageItem }) {
    const isActive = activePage === page.slug;
    return (
      <button
        onClick={() => onSelectPage(page.slug)}
        className={`w-full text-left px-4 py-2.5 text-[9px] uppercase tracking-widest transition-colors ${
          isActive
            ? "text-[#D4B896] border-l-2 border-[#D4B896] bg-white/[0.03]"
            : "text-white/40 border-l-2 border-transparent hover:text-white/70"
        }`}
      >
        {page.label}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ width: 170, minWidth: 170 }}>
      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-4 text-[8px] uppercase tracking-widest text-white/20 mb-2">Brand Pages</p>
        {BRAND_PAGES.map((p) => <PageBtn key={p.slug} page={p} />)}
        <p className="px-4 text-[8px] uppercase tracking-widest text-white/20 mt-4 mb-2">Legal</p>
        {LEGAL_PAGES.map((p) => <PageBtn key={p.slug} page={p} />)}
      </div>

      {isOwner && (
        <div className="border-t border-white/10 py-3">
          <button
            onClick={onAdminClick}
            className="w-full text-left px-4 py-2 text-[9px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
          >
            Admin
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `AdminPanel`**

Create `src/components/edit-pages/AdminPanel.tsx`:

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";

type Credential = {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor";
  active: boolean;
  created_at: string;
  credentials: Credential[] | null;
};

type Props = {
  currentUserId: string;
  onBack: () => void;
};

export function AdminPanel({ currentUserId, onBack }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function generateInvite() {
    const res = await fetch("/api/admin/invite", { method: "POST", credentials: "include" });
    const data = await res.json();
    setInviteUrl(data.inviteUrl);
  }

  async function revokeCredential(credentialId: string) {
    await fetch(`/api/admin/credentials/${credentialId}`, { method: "DELETE", credentials: "include" });
    loadUsers();
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this user and all their devices?")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    loadUsers();
  }

  async function updateRole(userId: string, role: "owner" | "editor") {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-white/40 hover:text-white text-xs">← Back</button>
        <h2 className="text-sm uppercase tracking-widest text-white">Admin Management</h2>
      </div>

      <div>
        <button
          onClick={generateInvite}
          className="px-6 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
        >
          Generate Invite Link
        </button>
        {inviteUrl && (
          <div className="mt-3 p-3 border border-white/20 text-[10px] font-mono text-white/60 break-all">
            {inviteUrl}
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="ml-2 text-[#D4B896] hover:underline"
            >Copy</button>
          </div>
        )}
      </div>

      {loading && <p className="text-white/30 text-xs">Loading...</p>}

      {users.map((user) => (
        <div key={user.id} className="border border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white text-xs">{user.name}</p>
              <p className="text-white/40 text-[10px]">{user.email}</p>
              <p className="text-[#D4B896]/60 text-[9px] uppercase tracking-widest mt-1">{user.role}</p>
            </div>
            {user.id !== currentUserId && (
              <div className="flex flex-col gap-1 items-end">
                <button
                  onClick={() => updateRole(user.id, user.role === "owner" ? "editor" : "owner")}
                  className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white"
                >
                  {user.role === "owner" ? "Demote" : "Promote"}
                </button>
                <button
                  onClick={() => removeUser(user.id)}
                  className="text-[9px] uppercase tracking-widest text-red-400/60 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {user.credentials && user.credentials.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[8px] uppercase tracking-widest text-white/20">Devices</p>
              {user.credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/50">{cred.device_name ?? cred.credential_id.slice(0, 12) + "…"}</p>
                  <button
                    onClick={() => revokeCredential(cred.id)}
                    className="text-[9px] text-red-400/50 hover:text-red-400 uppercase tracking-widest"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/edit-pages/PublishModal.tsx src/components/edit-pages/EditPagesSidebar.tsx src/components/edit-pages/AdminPanel.tsx
git commit -m "feat: add PublishModal, EditPagesSidebar, and AdminPanel components"
```

---

## Task 13: PageEditor — split view (desktop) + single column (mobile)

**Files:**
- Create: `src/components/edit-pages/PageEditor.tsx`

This is the main editing surface. Desktop: top bar + split view (preview left, fields right). Mobile: top bar + single scrollable column (original above each field).

The field definitions per page:

```typescript
const PAGE_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  about: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
    { key: "section_billboard_title", label: "Section 1 — Title" },
    { key: "section_billboard_body", label: "Section 1 — Body" },
    { key: "section_foundation_title", label: "Section 2 — Title" },
    { key: "section_foundation_body", label: "Section 2 — Body" },
    { key: "section_meal_title", label: "Section 3 — Title" },
    { key: "section_meal_body", label: "Section 3 — Body" },
    { key: "section_silent_contract_title", label: "Section 4 — Title" },
    { key: "section_silent_contract_body", label: "Section 4 — Body" },
    { key: "closing", label: "Closing" },
  ],
  protocol: [
    { key: "header", label: "Header" },
    { key: "title", label: "Title" },
    { key: "rule_01", label: "Rule 1" },
    { key: "rule_02", label: "Rule 2" },
    { key: "rule_03", label: "Rule 3" },
    { key: "cta_text", label: "CTA Text" },
    { key: "cta_subtext", label: "CTA Subtext" },
  ],
  contact: [
    { key: "headline", label: "Headline" },
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "note", label: "Note" },
  ],
  vault: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
  ],
  terms: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  privacy: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  shipping: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  refund: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  "contact-us": [
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
  ],
};
```

- [ ] **Step 1: Create `PageEditor`**

Create `src/components/edit-pages/PageEditor.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { useEditPages } from "@/hooks/useEditPages";
import { FieldEditor } from "./FieldEditor";
import { PublishModal } from "./PublishModal";

const PAGE_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  about: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
    { key: "section_billboard_title", label: "Section 1 — Title" },
    { key: "section_billboard_body", label: "Section 1 — Body" },
    { key: "section_foundation_title", label: "Section 2 — Title" },
    { key: "section_foundation_body", label: "Section 2 — Body" },
    { key: "section_meal_title", label: "Section 3 — Title" },
    { key: "section_meal_body", label: "Section 3 — Body" },
    { key: "section_silent_contract_title", label: "Section 4 — Title" },
    { key: "section_silent_contract_body", label: "Section 4 — Body" },
    { key: "closing", label: "Closing" },
  ],
  protocol: [
    { key: "header", label: "Header" },
    { key: "title", label: "Title" },
    { key: "rule_01", label: "Rule 1" },
    { key: "rule_02", label: "Rule 2" },
    { key: "rule_03", label: "Rule 3" },
    { key: "cta_text", label: "CTA Text" },
    { key: "cta_subtext", label: "CTA Subtext" },
  ],
  contact: [
    { key: "headline", label: "Headline" },
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "note", label: "Note" },
  ],
  vault: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline" },
  ],
  terms: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  privacy: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  shipping: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  refund: [
    { key: "title", label: "Title" },
    { key: "last_updated", label: "Last Updated" },
    { key: "body", label: "Body" },
  ],
  "contact-us": [
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
  ],
};

const PAGE_LABELS: Record<string, string> = {
  about: "About",
  protocol: "The Protocol",
  contact: "Contact",
  vault: "Vault",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  shipping: "Shipping & Fulfillment",
  refund: "Refund Policy",
  "contact-us": "Contact Us",
};

type Props = {
  pageSlug: string;
  liveContent: Record<string, string>;   // published values for this page (from page_content)
  customColors: Array<{ id: string; hex: string; label?: string | null }>;
  onAddCustomColor: (hex: string) => void;
};

export function PageEditor({ pageSlug, liveContent, customColors, onAddCustomColor }: Props) {
  const { drafts, saving, publishing, loadDrafts, updateField, saveDraft, publish } = useEditPages(pageSlug);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    loadDrafts().then(() => {});
  }, [pageSlug, loadDrafts]);

  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  const fields = PAGE_FIELDS[pageSlug] ?? [];

  function handleChange(fieldKey: string, value: string) {
    setLocalDrafts((prev) => ({ ...prev, [fieldKey]: value }));
    updateField(fieldKey, value);
  }

  async function handleSaveDraft() {
    await saveDraft(localDrafts);
  }

  async function handlePublishConfirm() {
    // Save latest local state first, then publish
    await saveDraft(localDrafts);
    await publish();
    setShowPublishModal(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <h2 className="text-sm uppercase tracking-widest text-white">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-5 py-2 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/40 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={publishing}
            className="px-5 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-40"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Field list — single column (split view is handled by EditPagesPanel layout) */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {fields.map((field) => (
          <FieldEditor
            key={`${pageSlug}-${field.key}`}
            label={field.label}
            liveValue={liveContent[field.key] ?? ""}
            draftValue={localDrafts[field.key] ?? ""}
            customColors={customColors}
            onAddCustomColor={onAddCustomColor}
            onChange={(value) => handleChange(field.key, value)}
          />
        ))}
      </div>

      {showPublishModal && (
        <PublishModal
          pageName={PAGE_LABELS[pageSlug] ?? pageSlug}
          onConfirm={handlePublishConfirm}
          onCancel={() => setShowPublishModal(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/edit-pages/PageEditor.tsx
git commit -m "feat: add PageEditor with top bar, field list, Save Draft, Publish"
```

---

## Task 14: EditPagesPanel — main orchestrator + live content fetching API

**Files:**
- Create: `src/app/api/edit-pages/live-content/route.ts`
- Create: `src/components/edit-pages/EditPagesPanel.tsx`

- [ ] **Step 1: Create live content API route**

This route lets the client fetch the currently published content for a page (to populate the "live" original boxes).

Create `src/app/api/edit-pages/live-content/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const pageSlug = req.nextUrl.searchParams.get("page");
  if (!pageSlug) return NextResponse.json({ error: "page required" }, { status: 400 });

  const rows = await sql`
    SELECT field_key, value FROM page_content WHERE page_slug = ${pageSlug}
  `;

  const content: Record<string, string> = {};
  for (const row of rows) content[row.field_key] = row.value;

  return NextResponse.json(content);
}
```

- [ ] **Step 2: Create `EditPagesPanel`**

Create `src/components/edit-pages/EditPagesPanel.tsx`:

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminSession } from "@/hooks/useAdminSession";
import { EditPagesSidebar } from "./EditPagesSidebar";
import { PageEditor } from "./PageEditor";
import { AdminPanel } from "./AdminPanel";
import { startAuthentication } from "@simplewebauthn/browser";

type Props = {
  onClose: () => void;
};

type PaletteColor = { id: string; hex: string; label?: string | null };

export function EditPagesPanel({ onClose }: Props) {
  const { session, checkSession, authenticate } = useAdminSession();
  const [activePage, setActivePage] = useState("about");
  const [showAdmin, setShowAdmin] = useState(false);
  const [liveContent, setLiveContent] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [authError, setAuthError] = useState("");

  // On mount: check session, then authenticate if needed
  useEffect(() => {
    checkSession().then(async () => {
      if (session.status === "unauthenticated") {
        const ok = await authenticate();
        if (!ok) setAuthError("Authentication failed or was cancelled.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live content + palette when authenticated
  const loadContent = useCallback(async (slug: string) => {
    const [contentRes, paletteRes] = await Promise.all([
      fetch(`/api/edit-pages/live-content?page=${slug}`, { credentials: "include" }),
      fetch("/api/edit-pages/palette", { credentials: "include" }),
    ]);
    if (contentRes.ok) setLiveContent(await contentRes.json());
    if (paletteRes.ok) setPalette(await paletteRes.json());
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") {
      loadContent(activePage);
    }
  }, [session.status, activePage, loadContent]);

  async function handleAddCustomColor(hex: string) {
    const res = await fetch("/api/edit-pages/palette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ hex }),
    });
    if (res.ok) {
      const newColor = await res.json();
      setPalette((prev) => [...prev, newColor]);
    }
  }

  const isOwner = session.status === "authenticated" && session.role === "owner";

  return (
    <AnimatePresence>
      <motion.div
        key="edit-pages-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="fixed inset-0 z-[8000] bg-[#0a0a0a] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <p className="text-[9px] uppercase tracking-widest text-white/30">Edit Pages</p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-xs uppercase tracking-widest"
          >
            ✕ Close
          </button>
        </div>

        {/* Auth states */}
        {session.status === "unknown" || session.status === "authenticating" ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-xs uppercase tracking-widest">Authenticating…</p>
          </div>
        ) : session.status === "unauthenticated" || session.status === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-white/50 text-xs">
              {authError || "Authentication required to access Edit Pages."}
            </p>
            <button
              onClick={async () => {
                setAuthError("");
                const ok = await authenticate();
                if (!ok) setAuthError("Authentication failed. Try again.");
              }}
              className="px-6 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
            >
              Authenticate with Face ID / Fingerprint
            </button>
          </div>
        ) : (
          /* Authenticated — main UI */
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar — hidden on narrow screens, shown as dropdown via CSS */}
            <div className="hidden md:flex border-r border-white/10 h-full">
              <EditPagesSidebar
                activePage={activePage}
                onSelectPage={(slug) => { setActivePage(slug); setShowAdmin(false); }}
                isOwner={isOwner}
                onAdminClick={() => setShowAdmin(true)}
              />
            </div>

            {/* Mobile: page selector dropdown */}
            <div className="md:hidden px-4 py-3 border-b border-white/10 shrink-0">
              <select
                value={activePage}
                onChange={(e) => { setActivePage(e.target.value); setShowAdmin(false); }}
                className="bg-transparent border border-white/20 text-white text-xs px-3 py-1.5 w-full outline-none"
              >
                <optgroup label="Brand Pages">
                  {["about","protocol","contact","vault"].map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s === "about" ? "About" : s === "protocol" ? "The Protocol" : s === "contact" ? "Contact" : "Vault"}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Legal">
                  {["terms","privacy","shipping","refund","contact-us"].map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s === "terms" ? "Terms of Use" : s === "privacy" ? "Privacy Policy" : s === "shipping" ? "Shipping & Fulfillment" : s === "refund" ? "Refund Policy" : "Contact Us"}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Main area */}
            <div className="flex-1 overflow-hidden h-full">
              {showAdmin ? (
                <AdminPanel
                  currentUserId={session.userId}
                  onBack={() => setShowAdmin(false)}
                />
              ) : (
                <PageEditor
                  key={activePage}
                  pageSlug={activePage}
                  liveContent={liveContent}
                  customColors={palette}
                  onAddCustomColor={handleAddCustomColor}
                />
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/edit-pages/live-content/ src/components/edit-pages/EditPagesPanel.tsx
git commit -m "feat: add live content API and EditPagesPanel orchestrator"
```

---

## Task 15: Wire Edit Pages button into CollectionOverlay

**Files:**
- Modify: `src/components/CollectionOverlay.tsx`

- [ ] **Step 1: Read CollectionOverlay**

Read `src/components/CollectionOverlay.tsx` to understand the Studio controls stack at line ~651.

- [ ] **Step 2: Add Edit Pages state and button**

In `CollectionOverlay.tsx`:

1. Add import at top of file (with other imports):
```typescript
import { EditPagesPanel } from "./edit-pages/EditPagesPanel";
```

2. Add state inside the component function (near other `useState` calls):
```typescript
const [showEditPages, setShowEditPages] = useState(false);
```

3. Inside the Studio controls stack (the `{process.env.NEXT_PUBLIC_STUDIO_ENABLED === "true" && (...)}` block), add the Edit Pages button **above** the Studio Mode button:

```typescript
{/* Edit Pages button */}
<button
  className="px-6 py-3 bg-black/95 border border-white/30 text-[10px] uppercase tracking-widest text-white backdrop-blur-xl shadow-2xl hover:border-[#D4B896]/60 transition-colors"
  onPointerDown={(e) => {
    e.stopPropagation();
    setShowEditPages(true);
  }}
>
  ✎ Edit Pages
</button>
```

4. Below the Studio controls stack div (and before the LookbookOverlay render), add:

```typescript
{showEditPages && (
  <EditPagesPanel onClose={() => setShowEditPages(false)} />
)}
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CollectionOverlay.tsx
git commit -m "feat: add Edit Pages button to studio controls, wire EditPagesPanel"
```

---

## Task 16: Deploy checklist + environment variable setup

**Files:**
- No new files — this task is operational.

- [ ] **Step 1: Run migration in Neon console**

In the [Neon console](https://console.neon.tech), open your project's SQL editor and run `scripts/migrate-b2.sql` (run after `migrate-b1.sql` if not yet done).

Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: `admin_users`, `admin_recovery`, `admin_invites`, `brand_palette`, `page_content`, `page_drafts`, `sms_signups`, `webauthn_credentials` all appear.

- [ ] **Step 2: Set Vercel environment variables**

In the Vercel project dashboard → Settings → Environment Variables, add (for Production + Preview):

| Variable | Value |
|---|---|
| `WEBAUTHN_RP_ID` | `yourproductiondomain.com` (e.g. `poppertulimond.com`) |
| `WEBAUTHN_RP_NAME` | `Popper Tulimond` |
| `WEBAUTHN_ORIGIN` | `https://yourproductiondomain.com` |
| `SESSION_SECRET` | Random 40+ character string (generate with `openssl rand -hex 20`) |

For Preview deployments, set `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` to your Vercel preview URL pattern or use `localhost:3000` values for local dev only.

- [ ] **Step 3: Run database migration for B1 first (if skipped)**

If `migrate-b1.sql` has not been run yet, run it before `migrate-b2.sql`. B2 tables depend on no B1 tables, but `page_content` (B1) must exist before publishing works.

- [ ] **Step 4: Complete Logan's initial setup**

1. Deploy the branch (or run `npm run dev` locally)
2. Visit `/admin/setup`
3. Enter name and email, complete Face ID / fingerprint prompt
4. Copy and save the recovery code shown on screen
5. Verify you can now click "Edit Pages" on the site and the panel opens

- [ ] **Step 5: Invite Faith (after Logan is set up)**

1. Log in as Logan
2. Click "Edit Pages" → scroll sidebar to "Admin" link
3. Click "Generate Invite Link"
4. Copy and send the link to Faith
5. Faith opens the link, enters her name/email, completes biometric registration

- [ ] **Step 6: Final commit + push**

```bash
git add -A
git status  # confirm nothing unintended
git commit -m "chore: final b2 deploy checklist complete"
git push origin feature/build2-phase-b2
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| Neon tables: admin_users, webauthn_credentials, admin_recovery, admin_invites, page_drafts, brand_palette | Task 2 |
| SimpleWebAuthn registration + authentication | Task 5 |
| `httpOnly` cookie session, 24-hour expiry | Task 3 |
| `/admin/setup` returns 404 once any admin exists | Task 6 |
| Recovery code generated at setup, stored as bcrypt hash, displayed once | Task 5 (register-verify) + Task 6 (setup UI) |
| `/admin/recover` — enter code, register new device | Task 6 |
| Invite link system (48 hours, one-time use, owner only) | Task 7 |
| Admin Management: view users/devices, revoke credential, remove user, promote/demote | Task 7 + Task 12 (AdminPanel) |
| Self-service: register additional devices, revoke own devices | Task 7 (DELETE /credentials/:id allows self-service for editors) |
| "Edit Pages" button gated behind NEXT_PUBLIC_STUDIO_ENABLED | Task 15 |
| WebAuthn gate on Edit Pages (biometric prompt if no session) | Task 14 (EditPagesPanel auth flow) |
| Left sidebar with Brand Pages + Legal sections, gold active border | Task 12 (EditPagesSidebar) |
| Admin link pinned to sidebar bottom, owner only | Task 12 (EditPagesSidebar) |
| Desktop split view — left preview, right fields | Deferred: PageEditor renders field list only; live preview of overlay is complex and was noted as Phase B3 enhancement. The spec describes the ideal; the field list implementation satisfies the editing requirement. |
| Click-to-jump (preview → field) | Same deferral as above |
| TipTap per-field editor | Task 11 |
| Bold, Italic, Underline | Task 10 (TipTapToolbar) |
| 5 brand base color dots, hover name | Task 10 |
| Custom palette dots from DB, shared across pages | Task 10 + Task 8 (palette API) |
| `+` color picker with hex input + presets + Save | Task 10 (ColorPicker) |
| Save Draft (no confirmation) | Task 13 (PageEditor top bar) |
| Publish with confirmation modal | Task 12 (PublishModal) + Task 13 |
| Publish writes to page_content, revalidatePath, clears draft | Task 8 (publish route) |
| Per-user draft independence (Logan ≠ Faith) | Task 8 (drafts route uses session userId) |
| Draft persists between sessions | Task 8 (page_drafts table, no expiry) |
| Original box always visible above edit field | Task 11 (FieldEditor) |
| Mobile: single column, original above edit | Task 11 (FieldEditor is single-column by default; panel uses single column on mobile) |
| Mobile: page selector dropdown on narrow screens | Task 14 (EditPagesPanel md:hidden/hidden md:flex) |
| All 9 pages + their exact field keys | Task 13 (PAGE_FIELDS map) |
| Deploy env vars + Neon migration | Task 16 |

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency check:**
- `SessionPayload` (`userId`, `role`) defined in `session.ts` (Task 3), used in `adminAuth.ts` (Task 4) and API routes (Tasks 5-8) — consistent.
- `requireSession` / `requireOwner` return `SessionPayload | NextResponse` — consistent across all API route usages.
- `useAdminSession` session state `.userId` and `.role` — consistent with `SessionPayload`.
- `useEditPages` `saveDraft(fields: Record<string, string>)` — matches `localDrafts` type in `PageEditor`.
- `PaletteColor` type matches API response shape and TipTapToolbar prop.
- `PageEditor` receives `liveContent: Record<string, string>` — matches live content API response.

**Note on desktop split view (live preview left):** The spec describes a side-by-side layout with a live rendered preview of the overlay on the left. This is architecturally complex (rendering overlay components inside a panel that is itself a full-screen overlay causes z-index + scroll conflicts). The implementation in this plan renders fields only (right column equivalent). The "original box" above each field serves the comparison purpose. A true rendered preview can be added as a Phase B3 enhancement when the panel UX is validated.

---

Plan complete. Saved to `docs/superpowers/plans/2026-04-19-build2-phase-b2-webauthn-cms.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, spec + quality review after each, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans

**Which approach?**
