import { create } from "zustand";

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastState = {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, "id"> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

function makeToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = toast.id ?? makeToastId();
    set((state) => ({
      toasts: [{ ...toast, id }, ...state.toasts].slice(0, 6),
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
