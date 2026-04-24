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
          registered devices, you&apos;ll need this to regain access.
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
