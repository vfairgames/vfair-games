import { create } from 'zustand';
import { readStoredToken } from './auth-token';
import { createAuthActions } from './auth-session';
import type { AuthState } from './auth-types';

const bootstrapToken = readStoredToken();

export const useAuthStore = create<AuthState>((set, get) => {
  const actions = createAuthActions({ setState: set, getState: get });

  return {
    sessionStatus: bootstrapToken ? 'unknown' : 'unauthenticated',
    token: bootstrapToken,
    user: null,
    error: null,
    login: actions.login,
    logout: actions.logout,
    initializeSession: actions.initializeSession,
    checkSession: actions.checkSession,
    applySessionUpdate: actions.applySessionUpdate,
  };
});
