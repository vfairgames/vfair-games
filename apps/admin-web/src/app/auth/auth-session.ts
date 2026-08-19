import {
  AUTH_TOKEN_KEY,
  persistToken,
  readStoredToken,
  registerSessionInvalidator,
  removeStoredToken,
} from './auth-token';
import type { AuthState, AuthUser } from './auth-types';
import {
  signInRequest,
  verifySessionWithApi,
} from '../services/admin-api.service';

type AuthStore = {
  getState: () => AuthState;
  setState: (
    partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
  ) => void;
};

type VerifyContext = {
  firstLoad: boolean;
};

let sessionEpoch = 0;
let initPromise: Promise<void> | null = null;
let activeValidation: { token: string; promise: Promise<boolean> } | null =
  null;

const bumpSessionEpoch = (): void => {
  sessionEpoch += 1;
};

const isStale = (epoch: number, token: string): boolean =>
  epoch !== sessionEpoch || readStoredToken() !== token;

const setAuthenticated = (
  store: AuthStore,
  token: string,
  user: AuthUser,
): void => {
  store.setState({
    sessionStatus: 'authenticated',
    token,
    user,
    error: null,
  });
};

const setUnauthenticated = (
  store: AuthStore,
  token: string | null = null,
): void => {
  store.setState({
    sessionStatus: 'unauthenticated',
    token,
    user: null,
  });
};

const resetSessionState = (store: AuthStore): void => {
  bumpSessionEpoch();
  store.setState({
    sessionStatus: 'unauthenticated',
    token: null,
    user: null,
    error: null,
  });
};

const clearSession = (store: AuthStore): void => {
  removeStoredToken();
  resetSessionState(store);
};

const finishUnknownSession = (store: AuthStore): void => {
  if (store.getState().sessionStatus !== 'unknown') {
    return;
  }
  setUnauthenticated(store, readStoredToken());
};

const handleNetworkError = (
  store: AuthStore,
  token: string,
  context: VerifyContext,
): void => {
  const { sessionStatus } = store.getState();
  const shouldShowSignIn = context.firstLoad || sessionStatus === 'unknown';

  if (shouldShowSignIn) {
    setUnauthenticated(store, token);
  }
};

const verifyToken = async (
  store: AuthStore,
  token: string,
  context: VerifyContext,
): Promise<boolean> => {
  const epoch = sessionEpoch;
  const result = await verifySessionWithApi(token);

  if (isStale(epoch, token)) {
    finishUnknownSession(store);
    return false;
  }

  if (result.status === 'network') {
    handleNetworkError(store, token, context);
    return false;
  }

  if (result.status === 'invalid') {
    clearSession(store);
    return false;
  }

  setAuthenticated(store, token, result.user);
  return true;
};

const verifyStoredToken = (
  store: AuthStore,
  token: string,
  context: VerifyContext,
): Promise<boolean> => {
  if (activeValidation?.token === token) {
    return activeValidation.promise;
  }

  const promise = verifyToken(store, token, context).finally(() => {
    if (activeValidation?.promise === promise) {
      activeValidation = null;
    }
  });

  activeValidation = { token, promise };
  return promise;
};

const hasActiveSession = (store: AuthStore, token: string): boolean => {
  const { sessionStatus, token: stateToken, user } = store.getState();
  return (
    sessionStatus === 'authenticated' && stateToken === token && user !== null
  );
};

export const createAuthActions = (store: AuthStore) => {
  registerSessionInvalidator(() => resetSessionState(store));

  const login = async (email: string, password: string): Promise<boolean> => {
    const epoch = ++sessionEpoch;
    store.setState({ error: null });

    const signInResult = await signInRequest(email, password);
    if (epoch !== sessionEpoch) {
      return false;
    }

    if ('error' in signInResult) {
      store.setState({ error: signInResult.error });
      return false;
    }

    const verifyResult = await verifySessionWithApi(signInResult.accessToken);
    if (epoch !== sessionEpoch) {
      return false;
    }

    if (verifyResult.status === 'network') {
      store.setState({ error: 'Network error. Please try again.' });
      return false;
    }

    if (verifyResult.status === 'invalid') {
      store.setState({ error: 'Received an invalid token. Please try again.' });
      return false;
    }

    persistToken(signInResult.accessToken);
    setAuthenticated(store, signInResult.accessToken, verifyResult.user);
    return true;
  };

  const logout = (): void => {
    clearSession(store);
  };

  const initializeSession = async (): Promise<void> => {
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      const token = readStoredToken();
      if (!token) {
        store.setState({
          sessionStatus: 'unauthenticated',
          token: null,
          user: null,
        });
        return;
      }

      if (hasActiveSession(store, token)) {
        return;
      }

      store.setState({ sessionStatus: 'unknown', token });
      await verifyStoredToken(store, token, { firstLoad: true });
      finishUnknownSession(store);
    })().finally(() => {
      initPromise = null;
    });

    await initPromise;
  };

  const checkSession = async (): Promise<void> => {
    if (initPromise) {
      await initPromise;
    }

    const token = readStoredToken();
    if (!token) {
      store.setState({
        sessionStatus: 'unauthenticated',
        token: null,
        user: null,
      });
      return;
    }

    await verifyStoredToken(store, token, { firstLoad: false });
  };

  const syncFromOtherTab = (token: string | null): void => {
    if (!token) {
      clearSession(store);
      return;
    }

    void verifyStoredToken(store, token, { firstLoad: false });
  };

  const applySessionUpdate = (token: string, user: AuthUser): void => {
    persistToken(token);
    setAuthenticated(store, token, user);
  };

  return {
    login,
    logout,
    initializeSession,
    checkSession,
    syncFromOtherTab,
    applySessionUpdate,
  };
};

export const subscribeToAuthTokenChanges = (
  onTokenChange: (token: string | null) => void,
): (() => void) => {
  const handler = (event: StorageEvent): void => {
    if (event.key !== AUTH_TOKEN_KEY) {
      return;
    }
    onTokenChange(event.newValue);
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
