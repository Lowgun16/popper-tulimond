"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pt_model_preference";

export function useModelPreference() {
  const [modelId, setModelId] = useState<string | null>(null);

  useEffect(() => {
    setModelId(localStorage.getItem(STORAGE_KEY));
  }, []);

  const selectModel = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setModelId(id);
  }, []);

  const clearModel = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setModelId(null);
  }, []);

  return { modelId, selectModel, clearModel };
}
