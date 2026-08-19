import {
  useToastStore,
  type ToastInput,
  type ToastOptions,
} from '../store/toast-store/toast-store';

class ToastService {
  show(input: ToastInput): string {
    return useToastStore.getState().addToast(input);
  }

  dismiss(id: string): void {
    useToastStore.getState().requestClose(id);
  }

  clearAll(): void {
    const { toasts, requestClose } = useToastStore.getState();
    toasts.forEach((toast) => {
      if (toast.open) requestClose(toast.id);
    });
  }

  success(title: string, options?: ToastOptions): string {
    return this.show({ title, variant: 'success', ...options });
  }

  error(title: string, options?: ToastOptions): string {
    return this.show({ title, variant: 'error', ...options });
  }

  warning(title: string, options?: ToastOptions): string {
    return this.show({ title, variant: 'warning', ...options });
  }

  info(title: string, options?: ToastOptions): string {
    return this.show({ title, variant: 'info', ...options });
  }
}

export const toastService = new ToastService();
