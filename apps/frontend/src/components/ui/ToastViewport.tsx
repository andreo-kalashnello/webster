import { useEffect } from "react";
import { X } from "lucide-react";

import { useToastStore, type ToastItem, type ToastTone } from "@/shared/stores/toast.store";

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-50",
  error: "border-rose-400/40 bg-rose-500/10 text-rose-50",
  info: "border-sky-400/40 bg-sky-500/10 text-sky-50",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-50",
};

const DEFAULT_TONE: ToastTone = "info";
const DEFAULT_DURATION = 3500;

function ToastRow({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const duration = toast.durationMs ?? DEFAULT_DURATION;
    const timer = window.setTimeout(() => removeToast(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [removeToast, toast.durationMs, toast.id]);

  const tone = toast.tone ?? DEFAULT_TONE;

  return (
    <div
      className={
        "pointer-events-auto w-full rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur " +
        toneStyles[tone]
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{toast.title}</p>
          {toast.message ? <p className="mt-1 text-xs text-slate-200">{toast.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
