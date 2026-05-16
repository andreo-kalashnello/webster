import type { FC } from "react";

export const BlockingOverlay: FC<{ label?: string }> = ({ label = "Working..." }) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-5 py-4 text-sm text-slate-100 shadow-xl">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <span>{label}</span>
      </div>
    </div>
  );
};