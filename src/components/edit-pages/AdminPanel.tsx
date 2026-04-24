"use client";
import { useState, useEffect, useCallback } from "react";

type Credential = {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor";
  active: boolean;
  created_at: string;
  credentials: Credential[] | null;
};

type Props = {
  currentUserId: string;
  onBack: () => void;
};

export function AdminPanel({ currentUserId, onBack }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function generateInvite() {
    const res = await fetch("/api/admin/invite", { method: "POST", credentials: "include" });
    const data = await res.json();
    setInviteUrl(data.inviteUrl);
  }

  async function revokeCredential(credentialId: string) {
    await fetch(`/api/admin/credentials/${credentialId}`, { method: "DELETE", credentials: "include" });
    loadUsers();
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this user and all their devices?")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    loadUsers();
  }

  async function updateRole(userId: string, role: "owner" | "editor") {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-white/40 hover:text-white text-xs">← Back</button>
        <h2 className="text-sm uppercase tracking-widest text-white">Admin Management</h2>
      </div>

      <div>
        <button
          onClick={generateInvite}
          className="px-6 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
        >
          Generate Invite Link
        </button>
        {inviteUrl && (
          <div className="mt-3 p-3 border border-white/20 text-[10px] font-mono text-white/60 break-all">
            {inviteUrl}
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="ml-2 text-[#D4B896] hover:underline"
            >Copy</button>
          </div>
        )}
      </div>

      {loading && <p className="text-white/30 text-xs">Loading...</p>}

      {users.map((user) => (
        <div key={user.id} className="border border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white text-xs">{user.name}</p>
              <p className="text-white/40 text-[10px]">{user.email}</p>
              <p className="text-[#D4B896]/60 text-[9px] uppercase tracking-widest mt-1">{user.role}</p>
            </div>
            {user.id !== currentUserId && (
              <div className="flex flex-col gap-1 items-end">
                <button
                  onClick={() => updateRole(user.id, user.role === "owner" ? "editor" : "owner")}
                  className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white"
                >
                  {user.role === "owner" ? "Demote" : "Promote"}
                </button>
                <button
                  onClick={() => removeUser(user.id)}
                  className="text-[9px] uppercase tracking-widest text-red-400/60 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {user.credentials && user.credentials.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[8px] uppercase tracking-widest text-white/20">Devices</p>
              {user.credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/50">{cred.device_name ?? cred.credential_id.slice(0, 12) + "…"}</p>
                  <button
                    onClick={() => revokeCredential(cred.id)}
                    className="text-[9px] text-red-400/50 hover:text-red-400 uppercase tracking-widest"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
