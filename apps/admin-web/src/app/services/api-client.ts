import ky, { isHTTPError } from 'ky';
import type { AfterResponseHook, BeforeErrorHook, BeforeRequestHook } from 'ky';
import { invalidateSession, readStoredToken } from '../auth/auth-token';

type NestErrorData = {
  message?: string | string[];
};

const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const API_BASE = `${apiOrigin}/api`;

const addAuthHeader: BeforeRequestHook = ({ request }) => {
  const token = readStoredToken();
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
};

const handleUnauthorized: AfterResponseHook = ({ response }) => {
  if (response.status === 401) {
    invalidateSession();
  }
};

const parseError: BeforeErrorHook = ({ error }) => {
  if (isHTTPError(error)) {
    const data = error.data as NestErrorData | undefined;
    const msg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : typeof data?.message === 'string'
        ? data.message
        : error.response.statusText;
    error.message = msg;
  }
  return error;
};

export const apiClient = ky.create({
  prefix: API_BASE,
  hooks: {
    beforeRequest: [addAuthHeader],
    afterResponse: [handleUnauthorized],
    beforeError: [parseError],
  },
});
