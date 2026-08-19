import type { PinoLogger } from '@vfair/nest-utils';

const mockIsHTTPError = jest.fn();
const mockIsTimeoutError = jest.fn();
const mockIsNetworkError = jest.fn();

jest.mock('ky', () => ({
  isHTTPError: (error: unknown) => mockIsHTTPError(error),
  isTimeoutError: (error: unknown) => mockIsTimeoutError(error),
  isNetworkError: (error: unknown) => mockIsNetworkError(error),
}));

const mockPRetry = jest.fn(
  async <T>(
    operation: () => Promise<T>,
    options?: {
      retries?: number;
      shouldRetry?: (
        error: Error & { attemptNumber: number; retriesLeft: number },
      ) => boolean;
      onFailedAttempt?: (
        error: Error & { attemptNumber: number; retriesLeft: number },
      ) => void;
    },
  ): Promise<T> => {
    const maxAttempts = (options?.retries ?? 0) + 1;

    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const retriesLeft = maxAttempts - attemptNumber;
        const failedAttemptError = Object.assign(error as object, {
          attemptNumber,
          retriesLeft,
        }) as Error & { attemptNumber: number; retriesLeft: number };

        if (
          retriesLeft === 0 ||
          (options?.shouldRetry && !options.shouldRetry(failedAttemptError))
        ) {
          throw error;
        }

        options?.onFailedAttempt?.(failedAttemptError);
      }
    }

    throw new Error('p-retry mock exhausted attempts without throwing');
  },
);

jest.mock('p-retry', () => ({
  __esModule: true,
  default: mockPRetry,
}));

import {
  isRetryablePartnerWalletError,
  retryPartnerWalletCall,
} from './retry-partner-wallet-call';

type FakeHttpError = {
  response: {
    status: number;
  };
};

const createHttpError = (status: number): FakeHttpError => ({
  response: { status },
});

describe('isRetryablePartnerWalletError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsHTTPError.mockImplementation(
      (error: unknown): error is FakeHttpError =>
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as FakeHttpError).response?.status === 'number',
    );
    mockIsTimeoutError.mockReturnValue(false);
    mockIsNetworkError.mockReturnValue(false);
  });

  it('returns true for HTTP 503', () => {
    expect(isRetryablePartnerWalletError(createHttpError(503))).toBe(true);
  });

  it('returns true for HTTP 429', () => {
    expect(isRetryablePartnerWalletError(createHttpError(429))).toBe(true);
  });

  it('returns false for HTTP 400', () => {
    expect(isRetryablePartnerWalletError(createHttpError(400))).toBe(false);
  });

  it('returns false for HTTP 404', () => {
    expect(isRetryablePartnerWalletError(createHttpError(404))).toBe(false);
  });

  it('returns true for TimeoutError', () => {
    const error = new Error('timeout');
    mockIsHTTPError.mockReturnValue(false);
    mockIsTimeoutError.mockImplementation((value) => value === error);

    expect(isRetryablePartnerWalletError(error)).toBe(true);
  });
});

describe('retryPartnerWalletCall', () => {
  const logger = { warn: jest.fn() } as unknown as PinoLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsHTTPError.mockImplementation(
      (error: unknown): error is FakeHttpError =>
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as FakeHttpError).response?.status === 'number',
    );
    mockIsTimeoutError.mockImplementation(
      (error: unknown) => error instanceof Error && error.message === 'timeout',
    );
    mockIsNetworkError.mockReturnValue(false);
  });

  it('returns the result on the first attempt without logging', async () => {
    const operation = jest.fn().mockResolvedValue('ok');

    await expect(
      retryPartnerWalletCall({
        operation,
        logger,
        operationName: 'getBalance',
      }),
    ).resolves.toBe('ok');

    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(mockPRetry).toHaveBeenCalledWith(
      operation,
      expect.objectContaining({
        retries: 2,
        minTimeout: 250,
        factor: 2,
        maxTimeout: 2_000,
      }),
    );
  });

  it('retries transient failures and succeeds on the third attempt', async () => {
    const timeoutError = new Error('timeout');
    const operation = jest
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({ balance: 100 });

    await expect(
      retryPartnerWalletCall({
        operation,
        logger,
        operationName: 'getBalance',
        context: { playerId: 'player-1' },
      }),
    ).resolves.toEqual({ balance: 100 });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        retriesLeft: 2,
        operationName: 'getBalance',
        playerId: 'player-1',
      }),
      'Partner wallet call failed; retrying',
    );
  });

  it('throws after exhausting retries for transient failures', async () => {
    const error = createHttpError(503);
    const operation = jest.fn().mockRejectedValue(error);

    await expect(
      retryPartnerWalletCall({
        operation,
        logger,
        operationName: 'processTransaction',
      }),
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable HTTP errors', async () => {
    const error = createHttpError(400);
    const operation = jest.fn().mockRejectedValue(error);

    await expect(
      retryPartnerWalletCall({
        operation,
        logger,
        operationName: 'processTransaction',
      }),
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
