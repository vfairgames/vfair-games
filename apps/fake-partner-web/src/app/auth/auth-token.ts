export const AUTH_TOKEN_KEY = 'partner_access_token';

type JwtPayload = {
  exp?: number;
};

const decodeBase64Url = (base64url: string): string => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  return atob(padded);
};

const readJwtPayload = (token: string): JwtPayload | null => {
  try {
    return JSON.parse(decodeBase64Url(token.split('.')[1])) as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = readJwtPayload(token);
  return payload?.exp === undefined || payload.exp * 1000 <= Date.now();
};

export const readStoredToken = (): string | null => {
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!stored) {
    return null;
  }
  if (isTokenExpired(stored)) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
  return stored;
};

export const persistToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};
