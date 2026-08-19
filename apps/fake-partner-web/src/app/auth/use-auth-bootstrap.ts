import { useEffect } from 'react';
import { useAuthStore } from './auth-store';

export const useAuthBootstrap = (): void => {
  const initializeSession = useAuthStore((s) => s.initializeSession);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);
};
