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
