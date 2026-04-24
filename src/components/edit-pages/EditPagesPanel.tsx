"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminSession } from "@/hooks/useAdminSession";
import { EditPagesSidebar } from "./EditPagesSidebar";
import { PageEditor, type PageEditorHandle } from "./PageEditor";
import { AdminPanel } from "./AdminPanel";
import { ProductEditor } from "./ProductEditor";
import { PreviewPane } from "./PreviewPane";

type Props = {
  onClose: () => void;
};

type PaletteColor = { id: string; hex: string; label?: string | null };

export function EditPagesPanel({ onClose }: Props) {
  const { session, checkSession, authenticate } = useAdminSession();
  const [activePage, setActivePage] = useState("about");
  const [showAdmin, setShowAdmin] = useState(false);
  const [liveContent, setLiveContent] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [authError, setAuthError] = useState("");

  // On mount: check session, then authenticate if needed
  useEffect(() => {
    checkSession().then(async () => {
      if (session.status === "unauthenticated") {
        const ok = await authenticate();
        if (!ok) setAuthError("Authentication failed or was cancelled.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live content + palette when authenticated
  const loadContent = useCallback(async (slug: string) => {
    const [contentRes, paletteRes] = await Promise.all([
      fetch(`/api/edit-pages/live-content?page=${slug}`, { credentials: "include" }),
      fetch("/api/edit-pages/palette", { credentials: "include" }),
    ]);
    if (contentRes.ok) setLiveContent(await contentRes.json());
    if (paletteRes.ok) setPalette(await paletteRes.json());
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") {
      loadContent(activePage);
    }
  }, [session.status, activePage, loadContent]);

  async function handleAddCustomColor(hex: string) {
    const res = await fetch("/api/edit-pages/palette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ hex }),
    });
    if (res.ok) {
      const newColor = await res.json();
      setPalette((prev) => [...prev, newColor]);
    }
  }

  const [showPreview, setShowPreview] = useState(false);
  const isOwner = session.status === "authenticated" && session.role === "owner";
  const pageEditorRef = useRef<PageEditorHandle>(null);

  return (
    <AnimatePresence>
      <motion.div
        key="edit-pages-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="fixed inset-0 z-[8000] bg-[#0a0a0a] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <p className="text-[9px] uppercase tracking-widest text-white/30">Edit Pages</p>
          <div className="flex items-center gap-4">
            {session.status === "authenticated" && !showAdmin && activePage !== "products" && (
              <button
                onClick={() => setShowPreview(true)}
                className="text-white/30 hover:text-white text-xs uppercase tracking-widest"
              >
                Preview
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white text-xs uppercase tracking-widest"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Auth states */}
        {session.status === "unknown" || session.status === "authenticating" ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-xs uppercase tracking-widest">Authenticating…</p>
          </div>
        ) : session.status === "unauthenticated" || session.status === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-white/50 text-xs">
              {authError || "Authentication required to access Edit Pages."}
            </p>
            <button
              onClick={async () => {
                setAuthError("");
                const ok = await authenticate();
                if (!ok) setAuthError("Authentication failed. Try again.");
              }}
              className="px-6 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
            >
              Authenticate with Face ID / Fingerprint
            </button>
          </div>
        ) : (
          /* Authenticated — main UI */
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Mobile: combined sticky top bar — page selector + actions */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-white/10 shrink-0">
              <select
                value={activePage}
                onChange={(e) => { setActivePage(e.target.value); setShowAdmin(false); }}
                className="flex-1 bg-transparent border border-white/20 text-white text-[10px] px-2 py-1.5 outline-none min-w-0"
              >
                <optgroup label="Brand Pages">
                  {["about","protocol","contact","vault"].map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s === "about" ? "About" : s === "protocol" ? "The Protocol" : s === "contact" ? "Contact" : "Vault"}
                    </option>
                  ))}
                  {isOwner && (
                    <option value="products" className="bg-black">Products</option>
                  )}
                </optgroup>
                <optgroup label="Legal">
                  {["terms","privacy","shipping","refund","contact-us"].map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s === "terms" ? "Terms of Use" : s === "privacy" ? "Privacy Policy" : s === "shipping" ? "Shipping & Fulfillment" : s === "refund" ? "Refund Policy" : "Contact Us"}
                    </option>
                  ))}
                </optgroup>
              </select>
              {activePage !== "products" && (
                <>
                  <button
                    onClick={() => pageEditorRef.current?.save()}
                    disabled={pageEditorRef.current?.saving}
                    className="shrink-0 px-3 py-1.5 border border-white/20 text-white/60 text-[9px] uppercase tracking-widest disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => pageEditorRef.current?.triggerPublish()}
                    disabled={pageEditorRef.current?.publishing}
                    className="shrink-0 px-3 py-1.5 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest disabled:opacity-40"
                  >
                    Publish
                  </button>
                </>
              )}
            </div>

            {/* Desktop sidebar + editor row */}
            <div className="flex flex-1 overflow-hidden">

              {/* Sidebar — desktop only */}
              <div className="hidden md:flex border-r border-white/10 h-full">
                <EditPagesSidebar
                  activePage={activePage}
                  onSelectPage={(slug) => { setActivePage(slug); setShowAdmin(false); }}
                  isOwner={isOwner}
                  onAdminClick={() => setShowAdmin(true)}
                  onProductsClick={() => { setActivePage("products"); setShowAdmin(false); }}
                />
              </div>

              {/* Main area */}
              <div className="flex-1 overflow-hidden h-full">
                {showAdmin ? (
                  <AdminPanel
                    currentUserId={session.userId}
                    onBack={() => setShowAdmin(false)}
                  />
                ) : activePage === "products" ? (
                  <ProductEditor />
                ) : (
                  <PageEditor
                    ref={pageEditorRef}
                    key={activePage}
                    pageSlug={activePage}
                    liveContent={liveContent}
                    customColors={palette}
                    onAddCustomColor={handleAddCustomColor}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <PreviewPane
            pageSlug={activePage}
            drafts={pageEditorRef.current?.getDrafts() ?? {}}
            liveContent={liveContent}
            onClose={() => setShowPreview(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
