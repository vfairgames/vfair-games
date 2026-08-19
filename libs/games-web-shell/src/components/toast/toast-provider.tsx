import * as RadixToast from '@radix-ui/react-toast';
import { Portal, Theme } from '@radix-ui/themes';
import { type ReactNode } from 'react';

import type { ThemeAppearance } from '@vfair/radix-palette';

import { APP_THEME_PROPS } from '../theme-provider/theme-config';
import { useToastStore } from '../../store/toast-store/toast-store';
import { ToastItem } from './toast-item';
import './toast.scss';

type ToastProviderProps = {
  appearance: ThemeAppearance;
  children: ReactNode;
};

export const ToastProvider = ({ appearance, children }: ToastProviderProps) => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
      <Portal>
        <Theme {...APP_THEME_PROPS} appearance={appearance}>
          <RadixToast.Viewport className="toast-viewport" />
        </Theme>
      </Portal>
    </RadixToast.Provider>
  );
};
