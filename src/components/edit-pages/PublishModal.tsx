"use client";

type Props = {
  pageName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PublishModal({ pageName, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-8">
      <div className="bg-[#0a0a0a] border border-white/20 p-8 max-w-sm w-full flex flex-col gap-6">
        <h2 className="text-sm uppercase tracking-widest text-white">Publish Changes</h2>
        <p className="text-white/50 text-xs leading-relaxed">
          You are about to publish your changes to the <span className="text-white">{pageName}</span> page.
          Visitors will see the new version immediately. The current live version will become the new baseline.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-white/20 text-white/50 text-[9px] uppercase tracking-widest hover:border-white/40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#D4B896] text-black text-[9px] uppercase tracking-widest"
          >
            Yes, Publish
          </button>
        </div>
      </div>
    </div>
  );
}
