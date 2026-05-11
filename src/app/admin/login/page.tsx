"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  // If a token is in the URL, redirect to verify immediately
  useEffect(() => {
    if (token) {
      window.location.href = `/api/admin/login-link/verify?token=${token}`;
    }
  }, [token]);

  async function handleRequest() {
    if (!email) return;
    setStatus("sending");
    await fetch("/api/admin/login-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setStatus("sent");
  }

  if (token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/30 text-xs uppercase tracking-widest">Signing in…</p>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(196,164,86,0.8)" }}>
          Popper Tulimond
        </p>
        <h1 className="text-xl tracking-widest uppercase font-light mt-4">Check your email</h1>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed mt-2">
          If that address is registered, a sign-in link is on its way. It expires in 15 minutes.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-white/25 uppercase tracking-widest mt-6 hover:text-white/50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      <p style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(196,164,86,0.8)" }}>
        Popper Tulimond
      </p>
      <h1 className="text-xl tracking-widest uppercase font-light mt-4">Sign In</h1>
      <p className="text-sm text-white/40 max-w-xs text-center leading-relaxed">
        Enter your email and we&apos;ll send you a sign-in link.
      </p>
      {error && (
        <p className="text-red-400/70 text-xs text-center max-w-xs">
          {error === "expired" ? "That link has expired or already been used. Request a new one below." : "Invalid link. Request a new one below."}
        </p>
      )}
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleRequest()}
        className="bg-transparent border border-white/20 text-white px-4 py-3 text-sm w-72 outline-none focus:border-[#D4B896] placeholder-white/20"
        autoFocus
      />
      <button
        onClick={handleRequest}
        disabled={status === "sending" || !email}
        className="px-10 py-3 bg-[#D4B896] text-black text-xs uppercase tracking-widest disabled:opacity-40"
      >
        {status === "sending" ? "Sending…" : "Send Sign-In Link"}
      </button>
      <a href="/" className="text-xs text-white/20 uppercase tracking-widest hover:text-white/40 mt-2">
        ← Back to site
      </a>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
