"use client";
import { useState, useEffect, useCallback } from "react";

export type MemberSession = { memberId: string } | null;

export function useMemberSession() {
  const [session, setSession] = useState<MemberSession>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/member/session");
      if (res.ok) {
        const data = await res.json();
        setSession(data.memberId ? { memberId: data.memberId } : null);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { session, loading, refresh };
}
