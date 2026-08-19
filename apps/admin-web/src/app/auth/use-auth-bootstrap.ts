import { useEffect } from 'react';
import { createAuthActions, subscribeToAuthTokenChanges } from './auth-session';
import { useAuthStore } from './auth-store';
import type { SessionStatus } from './auth-types';

const getStoreApi = () => ({
  getState: useAuthStore.getState,
  setState: useAuthStore.setState,
});

export const useAuthBootstrap = (): void => {
  const initializeSession = useAuthStore((s) => s.initializeSession);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void useAuthStore.getState().checkSession();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const { syncFromOtherTab } = createAuthActions(getStoreApi());
    return subscribeToAuthTokenChanges(syncFromOtherTab);
  }, []);
};

export const useRecoverSessionOnSignIn = (
  sessionStatus: SessionStatus,
): void => {
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      void useAuthStore.getState().checkSession();
    }
  }, [sessionStatus]);
};
