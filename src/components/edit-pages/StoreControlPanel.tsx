"use client";
import { useEffect, useState } from "react";

interface Opening {
  id: string; opens_at: string; early_access_at: string; closes_at: string;
  available_count: number; sold_count: number; status: string;
  announce_at: string | null; announce_sent_at: string | null;
  reminder_sent_at: string | null; earlybird_sent_at: string | null;
  limit_one_per_nonmember?: boolean;
}

export default function StoreControlPanel() {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [form, setForm] = useState({
    opensAtLocal: "", announceAtLocal: "", availableCount: 100,
    windowMinutes: 180, limitOnePerNonmember: false, announceMessage: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/admin/openings");
    if (r.ok) setOpenings((await r.json()).openings);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setError(null);
    const r = await fetch("/api/admin/openings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json()).error || "Failed"); return; }
    setForm({ ...form, opensAtLocal: "", announceAtLocal: "" });
    load();
  }

  async function act(id: string, action: "cancel" | "close-now") {
    if (!confirm(`${action} this opening?`)) return;
    setBusy(true); setError(null);
    const r = await fetch(`/api/admin/openings/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json()).error || "Failed"); return; }
    load();
  }

  return (
    <div className="p-4 text-[#F0E8D7]">
      <h2 className="mb-4 text-sm tracking-[0.25em] uppercase text-[#C4A456]">Store Control</h2>

      <div className="mb-8 space-y-3 border border-[#C4A456]/20 p-4">
        <label className="block text-xs">Opens at (your local time)
          <input type="datetime-local" value={form.opensAtLocal}
            onChange={(e) => setForm({ ...form, opensAtLocal: e.target.value })}
            className="mt-1 block w-full bg-black/40 p-2" />
        </label>
        <label className="block text-xs">Heads-up text sends at
          <input type="datetime-local" value={form.announceAtLocal}
            onChange={(e) => setForm({ ...form, announceAtLocal: e.target.value })}
            className="mt-1 block w-full bg-black/40 p-2" />
        </label>
        <label className="block text-xs">Quantity available
          <input type="number" value={form.availableCount}
            onChange={(e) => setForm({ ...form, availableCount: Number(e.target.value) })}
            className="mt-1 block w-full bg-black/40 p-2" />
        </label>
        <label className="block text-xs">Window (minutes, default 180 = 3h)
          <input type="number" value={form.windowMinutes}
            onChange={(e) => setForm({ ...form, windowMinutes: Number(e.target.value) })}
            className="mt-1 block w-full bg-black/40 p-2" />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.limitOnePerNonmember}
            onChange={(e) => setForm({ ...form, limitOnePerNonmember: e.target.checked })} />
          Limit 1 per non-member this opening
        </label>
        <label className="block text-xs">Heads-up text (leave blank for default)
          <textarea value={form.announceMessage}
            onChange={(e) => setForm({ ...form, announceMessage: e.target.value })}
            className="mt-1 block w-full bg-black/40 p-2" rows={2} />
        </label>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button disabled={busy || !form.opensAtLocal || !form.announceAtLocal} onClick={create}
          className="border border-[#C4A456] px-4 py-2 text-xs tracking-[0.2em] uppercase disabled:opacity-40">
          Schedule Opening
        </button>
      </div>

      <ul className="space-y-3">
        {openings.map((o) => (
          <li key={o.id} className="border border-[#C4A456]/15 p-3 text-xs">
            <div className="flex justify-between">
              <span>{new Date(o.opens_at).toLocaleString()} · {o.sold_count}/{o.available_count} sold</span>
              <span className="text-[#C4A456]">{o.status}{o.announce_sent_at ? " · locked" : ""}</span>
            </div>
            <div className="mt-1 opacity-60">
              Text1 {o.announce_sent_at ? "✓" : "—"} · Text2 {o.reminder_sent_at ? "✓" : "—"} · Text3 {o.earlybird_sent_at ? "✓" : "—"}
            </div>
            <div className="mt-2 flex gap-3">
              {!o.announce_sent_at && <button onClick={() => act(o.id, "cancel")} className="underline">Cancel</button>}
              {o.status !== "closed" && o.status !== "canceled" && <button onClick={() => act(o.id, "close-now")} className="underline text-red-400">Close now</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
