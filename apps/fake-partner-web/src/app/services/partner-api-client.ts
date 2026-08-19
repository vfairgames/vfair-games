import ky, { isHTTPError } from 'ky';
import type { BeforeErrorHook, KyInstance } from 'ky';

type ApiErrorBody = {
  message?: string | string[];
};

const parseErrorMessage = (body: ApiErrorBody): string => {
  if (Array.isArray(body.message)) {
    return body.message.join(', ');
  }
  return body.message ?? 'Request failed';
};

const parseError: BeforeErrorHook = ({ error }) => {
  if (isHTTPError(error)) {
    const data = error.data as ApiErrorBody | undefined;
    error.message = parseErrorMessage(data ?? {});
  }
  return error;
};

const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const partnerApiClient = ky.create({
  prefix: `${apiOrigin}/api`,
  hooks: {
    beforeError: [parseError],
  },
});

export const createAuthorizedPartnerClient = (token: string): KyInstance =>
  partnerApiClient.extend({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const unauthenticatedPartnerClient = partnerApiClient;
