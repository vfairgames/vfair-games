import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from './toast-store';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('addToast', () => {
  it('adds a toast with default variant and duration', () => {
    const id = useToastStore.getState().addToast({ title: 'Hello' });
    const { toasts } = useToastStore.getState();

    expect(id).toBe(toasts[0]?.id);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toEqual({
      id,
      title: 'Hello',
      description: undefined,
      variant: 'default',
      duration: 3000,
      closable: true,
      persist: false,
      open: true,
    });
  });

  it('applies custom fields', () => {
    const id = useToastStore.getState().addToast({
      title: 'Error',
      description: 'Something failed',
      variant: 'error',
      duration: 3000,
      closable: false,
    });

    expect(useToastStore.getState().toasts[0]).toEqual({
      id,
      title: 'Error',
      description: 'Something failed',
      variant: 'error',
      duration: 3000,
      closable: false,
      persist: false,
      open: true,
    });
  });

  it('uses infinite duration when persist is true', () => {
    const id = useToastStore.getState().addToast({
      title: 'Loading',
      persist: true,
      duration: 3000,
    });

    expect(useToastStore.getState().toasts[0]).toEqual({
      id,
      title: 'Loading',
      description: undefined,
      variant: 'default',
      duration: Infinity,
      closable: true,
      persist: true,
      open: true,
    });
  });
});

describe('requestClose', () => {
  it('sets open to false without removing the toast', () => {
    const id = useToastStore.getState().addToast({ title: 'One' });
    useToastStore.getState().requestClose(id);

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0]?.open).toBe(false);
  });
});

describe('removeToast', () => {
  it('removes a toast by id', () => {
    const id = useToastStore.getState().addToast({ title: 'One' });
    useToastStore.getState().removeToast(id);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
