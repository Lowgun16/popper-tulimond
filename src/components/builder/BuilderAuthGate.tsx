// src/components/builder/BuilderAuthGate.tsx
// Simple password gate — password stored in BUILDER_PASSWORD env var.
// On mobile the team enters the password once; it's remembered in sessionStorage.
"use client";
import { useState, useEffect } from "react";

const SESSION_KEY = "tulimond-builder-auth";

export function BuilderAuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/builder/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  }

  if (checking) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4B896]/60 text-center mb-2">
          Popper Tulimond Studio
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Team password"
          className={`w-full bg-black/40 border ${error ? "border-red-500/60" : "border-[#D4B896]/20"} text-[#D4B896] px-4 py-3 text-sm focus:outline-none focus:border-[#D4B896]/60`}
          autoFocus
        />
        <button
          type="submit"
          className="w-full py-3 bg-[#D4B896] text-black text-[10px] uppercase tracking-widest font-medium"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
