import { isHTTPError } from 'ky';
import type { AuthUser } from '../auth/auth-types';
import {
  persistToken,
  readStoredToken,
  removeStoredToken,
} from '../auth/auth-token';
import {
  createAuthorizedPartnerClient,
  unauthenticatedPartnerClient,
} from './partner-api-client';

export const signInRequest = async (
  username: string,
  password: string,
): Promise<{ accessToken: string } | { error: string }> => {
  try {
    const { accessToken } = await unauthenticatedPartnerClient
      .post('auth/sign-in', { json: { username, password } })
      .json<{ accessToken: string }>();

    if (!accessToken) {
      return { error: 'Received an invalid token. Please try again.' };
    }

    return { accessToken };
  } catch (error) {
    if (isHTTPError(error)) {
      return { error: error.message };
    }
    return { error: 'Network error. Please try again.' };
  }
};

export const fetchProfile = async (token: string): Promise<AuthUser | null> => {
  try {
    return await createAuthorizedPartnerClient(token)
      .get('auth/me')
      .json<AuthUser>();
  } catch {
    return null;
  }
};

export const loginWithCredentials = async (
  username: string,
  password: string,
): Promise<{ token: string; user: AuthUser } | { error: string }> => {
  const signInResult = await signInRequest(username, password);
  if ('error' in signInResult) {
    return signInResult;
  }

  const user = await fetchProfile(signInResult.accessToken);
  if (!user) {
    return { error: 'Received an invalid token. Please try again.' };
  }

  persistToken(signInResult.accessToken);
  return { token: signInResult.accessToken, user };
};

export const restoreSession = async (): Promise<{
  token: string;
  user: AuthUser;
} | null> => {
  const token = readStoredToken();
  if (!token) {
    return null;
  }

  const user = await fetchProfile(token);
  if (!user) {
    removeStoredToken();
    return null;
  }

  return { token, user };
};

export type GameLaunchMode = 'demo' | 'real';

export const launchGame = async (
  token: string,
  input: {
    gameId: string;
    currency: string;
    mode: GameLaunchMode;
    lang?: string;
    appearance?: 'light' | 'dark';
  },
): Promise<{ url: string } | { error: string }> => {
  try {
    const { url } = await createAuthorizedPartnerClient(token)
      .post('games/launch', { json: input })
      .json<{ url: string }>();

    if (!url) {
      return { error: 'Received an invalid launch response.' };
    }

    return { url };
  } catch (error) {
    if (isHTTPError(error)) {
      return { error: error.message };
    }
    return { error: 'Network error. Please try again.' };
  }
};

export const launchVerification = async (
  token: string,
  input: { lang?: string; appearance?: 'light' | 'dark' } = {},
): Promise<{ url: string } | { error: string }> => {
  try {
    const { url } = await createAuthorizedPartnerClient(token)
      .post('games/verification/launch', { json: input })
      .json<{ url: string }>();

    if (!url) {
      return { error: 'Received an invalid launch response.' };
    }

    return { url };
  } catch (error) {
    if (isHTTPError(error)) {
      return { error: error.message };
    }
    return { error: 'Network error. Please try again.' };
  }
};
