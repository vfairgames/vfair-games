import * as RadixToast from '@radix-ui/react-toast';
import { XIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, type AnimationEvent } from 'react';

import { useTranslation } from '../../i18n/i18n';
import { useToastStore } from '../../store/toast-store/toast-store';

type ToastItemProps = {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration: number;
  closable: boolean;
  persist: boolean;
};

const TOAST_CLOSE_ANIMATION_MS = 200;

const EXIT_ANIMATIONS = new Set(['toast-slide-out', 'toast-swipe-out']);

export const ToastItem = ({
  id,
  title,
  description,
  variant,
  duration,
  closable,
  persist,
}: ToastItemProps) => {
  const { t } = useTranslation();
  const removeToast = useToastStore((s) => s.removeToast);
  const requestClose = useToastStore((s) => s.requestClose);
  const open = useToastStore(
    (s) => s.toasts.find((t) => t.id === id)?.open ?? false,
  );
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showClose = closable && !persist;

  const clearRemoveTimer = useCallback(() => {
    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
  }, []);

  const scheduleRemove = useCallback(() => {
    clearRemoveTimer();
    removeTimerRef.current = setTimeout(() => {
      removeToast(id);
    }, TOAST_CLOSE_ANIMATION_MS);
  }, [clearRemoveTimer, id, removeToast]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) requestClose(id);
    },
    [id, requestClose],
  );

  useEffect(() => {
    if (!open) scheduleRemove();
  }, [open, scheduleRemove]);

  useEffect(() => () => clearRemoveTimer(), [clearRemoveTimer]);

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLLIElement>) => {
      if (open || !EXIT_ANIMATIONS.has(event.animationName)) return;
      clearRemoveTimer();
      removeToast(id);
    },
    [clearRemoveTimer, id, open, removeToast],
  );

  const blockDismissGesture = (event: { preventDefault: () => void }) => {
    if (!closable || persist) event.preventDefault();
  };

  return (
    <RadixToast.Root
      className={clsx(
        'toast-item',
        `toast-item--${variant}`,
        showClose && 'toast-item--closable',
        !description && 'toast-item--title-only',
        (!closable || persist) && 'toast-item--not-closable',
      )}
      duration={duration}
      open={open}
      onOpenChange={handleOpenChange}
      onAnimationEnd={handleAnimationEnd}
      onPointerMove={blockDismissGesture}
      onEscapeKeyDown={blockDismissGesture}
      onSwipeEnd={blockDismissGesture}
    >
      <RadixToast.Title className="toast-item__title">{title}</RadixToast.Title>
      {description ? (
        <RadixToast.Description className="toast-item__description">
          {description}
        </RadixToast.Description>
      ) : null}
      {showClose ? (
        <RadixToast.Close
          aria-label={t('shellClose')}
          className="toast-item__close"
        >
          <XIcon size={14} />
        </RadixToast.Close>
      ) : null}
    </RadixToast.Root>
  );
};
