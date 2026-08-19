export const AUTH_TOKEN_KEY = 'admin_access_token';

type SessionInvalidator = () => void;

let sessionInvalidator: SessionInvalidator | null = null;

export const registerSessionInvalidator = (
  handler: SessionInvalidator,
): void => {
  sessionInvalidator = handler;
};

export const readStoredToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_KEY);

export const persistToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const invalidateSession = (): void => {
  removeStoredToken();
  sessionInvalidator?.();
};
