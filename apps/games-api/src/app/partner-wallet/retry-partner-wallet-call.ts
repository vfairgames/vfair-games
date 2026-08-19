import pRetry from 'p-retry';
import { isHTTPError, isNetworkError, isTimeoutError } from 'ky';
import type { PinoLogger } from '@vfair/nest-utils';

const PARTNER_WALLET_RETRY_OPTIONS = {
  retries: 2,
  minTimeout: 250,
  factor: 2,
  maxTimeout: 2_000,
} as const;

type PartnerWalletOperationName = 'getBalance' | 'processTransaction';

type RetryPartnerWalletCallInput<T> = {
  operation: () => Promise<T>;
  logger: PinoLogger;
  operationName: PartnerWalletOperationName;
  context?: Record<string, unknown>;
};

export const isRetryablePartnerWalletError = (error: unknown): boolean => {
  if (isHTTPError(error)) {
    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }

  return isTimeoutError(error) || isNetworkError(error);
};

export const retryPartnerWalletCall = async <T>(
  input: RetryPartnerWalletCallInput<T>,
): Promise<T> =>
  pRetry(input.operation, {
    ...PARTNER_WALLET_RETRY_OPTIONS,
    shouldRetry: (error) => isRetryablePartnerWalletError(error),
    onFailedAttempt: (error) => {
      input.logger.warn(
        {
          error,
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          operationName: input.operationName,
          ...input.context,
        },
        'Partner wallet call failed; retrying',
      );
    },
  });
