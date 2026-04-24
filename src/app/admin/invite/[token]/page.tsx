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
