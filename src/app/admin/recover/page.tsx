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
