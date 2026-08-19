import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from '../store/toast-store/toast-store';
import { toastService } from './toast.service';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('clearAll', () => {
  it('requests close on every open toast', () => {
    toastService.show({ title: 'One' });
    toastService.show({ title: 'Two' });
    toastService.clearAll();

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(2);
    expect(toasts.every((toast) => !toast.open)).toBe(true);
  });

  it('leaves toasts in the store until exit animation completes', () => {
    toastService.show({ title: 'One' });
    toastService.clearAll();

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
