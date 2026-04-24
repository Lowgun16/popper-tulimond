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
