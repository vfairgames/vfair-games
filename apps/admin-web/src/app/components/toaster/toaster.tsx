import * as Toast from '@radix-ui/react-toast';
import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { useToastStore } from '../../store/toast-store';
import './toaster.scss';

export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((item) => (
        <Toast.Root
          key={item.id}
          className={clsx('toaster__item', `toaster__item--${item.variant}`)}
          duration={4000}
          onOpenChange={(open) => {
            if (!open) removeToast(item.id);
          }}
        >
          <div className="toaster__icon">
            {item.variant === 'success' && (
              <CheckCircleIcon size={18} weight="fill" />
            )}
            {item.variant === 'error' && (
              <XCircleIcon size={18} weight="fill" />
            )}
            {item.variant === 'warning' && (
              <WarningCircleIcon size={18} weight="fill" />
            )}
          </div>
          <Toast.Title className="toaster__title">{item.title}</Toast.Title>
          <Toast.Close className="toaster__close" aria-label="Dismiss">
            <XIcon size={14} />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="toaster__viewport" />
    </Toast.Provider>
  );
};
