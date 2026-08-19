import { create } from 'zustand';
import { removeStoredToken, readStoredToken } from './auth-token';
import type { AuthState } from './auth-types';
import {
  loginWithCredentials,
  restoreSession,
} from '../services/partner-api.service';

const bootstrapToken = readStoredToken();

export const useAuthStore = create<AuthState>((set) => ({
  sessionStatus: bootstrapToken ? 'unknown' : 'unauthenticated',
  token: bootstrapToken,
  user: null,
  error: null,

  login: async (username, password) => {
    set({ error: null });
    const result = await loginWithCredentials(username, password);

    if ('error' in result) {
      set({ error: result.error });
      return false;
    }

    set({
      sessionStatus: 'authenticated',
      token: result.token,
      user: result.user,
      error: null,
    });
    return true;
  },

  logout: () => {
    removeStoredToken();
    set({
      sessionStatus: 'unauthenticated',
      token: null,
      user: null,
      error: null,
    });
  },

  initializeSession: async () => {
    const token = readStoredToken();
    if (!token) {
      set({
        sessionStatus: 'unauthenticated',
        token: null,
        user: null,
      });
      return;
    }

    set({ sessionStatus: 'unknown', token });
    const session = await restoreSession();

    if (!session) {
      set({
        sessionStatus: 'unauthenticated',
        token: null,
        user: null,
      });
      return;
    }

    set({
      sessionStatus: 'authenticated',
      token: session.token,
      user: session.user,
      error: null,
    });
  },
}));
