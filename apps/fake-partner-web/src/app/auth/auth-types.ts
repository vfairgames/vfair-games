export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export type PlayerWallet = {
  currency: string;
  balance: string;
  decimals: number;
};

export type AuthUser = {
  id: number;
  username: string;
  wallets: PlayerWallet[];
};

export type AuthState = {
  sessionStatus: SessionStatus;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeSession: () => Promise<void>;
};
