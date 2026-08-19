export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export type AuthUser = {
  sub: string;
  email: string;
  role: string;
  partnerId: number | null;
  permissions: Record<string, boolean>;
};

export type AuthState = {
  sessionStatus: SessionStatus;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeSession: () => Promise<void>;
  checkSession: () => Promise<void>;
  applySessionUpdate: (token: string, user: AuthUser) => void;
};
