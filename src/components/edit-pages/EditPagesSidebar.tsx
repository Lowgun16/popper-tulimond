"use client";

export type PageItem = {
  slug: string;
  label: string;
};

const BRAND_PAGES: PageItem[] = [
  { slug: "about", label: "About" },
  { slug: "protocol", label: "The Protocol" },
  { slug: "contact", label: "Contact" },
  { slug: "vault", label: "Vault" },
];

const LEGAL_PAGES: PageItem[] = [
  { slug: "terms", label: "Terms of Use" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "shipping", label: "Shipping & Fulfillment" },
  { slug: "refund", label: "Refund Policy" },
  { slug: "contact-us", label: "Contact Us" },
];

type Props = {
  activePage: string;
  onSelectPage: (slug: string) => void;
  isOwner: boolean;
  onAdminClick: () => void;
};

export function EditPagesSidebar({ activePage, onSelectPage, isOwner, onAdminClick }: Props) {
  function PageBtn({ page }: { page: PageItem }) {
    const isActive = activePage === page.slug;
    return (
      <button
        onClick={() => onSelectPage(page.slug)}
        className={`w-full text-left px-4 py-2.5 text-[9px] uppercase tracking-widest transition-colors ${
          isActive
            ? "text-[#D4B896] border-l-2 border-[#D4B896] bg-white/[0.03]"
            : "text-white/40 border-l-2 border-transparent hover:text-white/70"
        }`}
      >
        {page.label}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ width: 170, minWidth: 170 }}>
      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-4 text-[8px] uppercase tracking-widest text-white/20 mb-2">Brand Pages</p>
        {BRAND_PAGES.map((p) => <PageBtn key={p.slug} page={p} />)}
        <p className="px-4 text-[8px] uppercase tracking-widest text-white/20 mt-4 mb-2">Legal</p>
        {LEGAL_PAGES.map((p) => <PageBtn key={p.slug} page={p} />)}
      </div>

      {isOwner && (
        <div className="border-t border-white/10 py-3">
          <button
            onClick={onAdminClick}
            className="w-full text-left px-4 py-2 text-[9px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
          >
            Admin
          </button>
        </div>
      )}
    </div>
  );
}
