import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  title: string;
  variant: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (item) =>
    set((s) => ({
      toasts: [...s.toasts, { ...item, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string) =>
    useToastStore.getState().addToast({ title, variant: 'success' }),
  error: (title: string) =>
    useToastStore.getState().addToast({ title, variant: 'error' }),
  warning: (title: string) =>
    useToastStore.getState().addToast({ title, variant: 'warning' }),
};
