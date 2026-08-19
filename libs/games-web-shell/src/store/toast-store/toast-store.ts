import { nanoid } from 'nanoid';
import { create } from 'zustand';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  closable: boolean;
  persist: boolean;
  open: boolean;
};

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  closable?: boolean;
  persist?: boolean;
};

export type ToastOptions = Omit<ToastInput, 'title' | 'variant'>;

type ToastState = {
  toasts: Toast[];
};

type ToastActions = {
  addToast: (input: ToastInput) => string;
  requestClose: (id: string) => void;
  removeToast: (id: string) => void;
};

type ToastStore = ToastState & ToastActions;

const DEFAULT_DURATION_MS = 3000;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (input) => {
    const id = nanoid();
    const toast: Toast = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'default',
      duration: input.persist
        ? Infinity
        : (input.duration ?? DEFAULT_DURATION_MS),
      closable: input.closable ?? true,
      persist: input.persist ?? false,
      open: true,
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));
    return id;
  },
  requestClose: (id) =>
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, open: false } : t,
      ),
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
