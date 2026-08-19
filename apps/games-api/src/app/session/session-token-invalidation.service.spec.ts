import type { PinoLogger } from '@vfair/nest-utils';
import type { RedisService } from '../redis/redis.service';
import { SessionTokenInvalidationService } from './session-token-invalidation.service';

describe('SessionTokenInvalidationService', () => {
  const createService = () => {
    const set = jest.fn().mockResolvedValue('OK');
    const exists = jest.fn().mockResolvedValue(0);
    const redisService = {
      client: { set, exists },
    } as unknown as RedisService;
    const logger = {
      warn: jest.fn(),
    } as unknown as PinoLogger;

    return {
      service: new SessionTokenInvalidationService(redisService, logger),
      set,
      exists,
      logger,
    };
  };

  it('stores invalidated token jti in redis with 12h ttl', async () => {
    const { service, set } = createService();

    await service.invalidate('jti-1');

    expect(set).toHaveBeenCalledWith(
      'games-api:session:invalidated:jti-1',
      '1',
      'EX',
      12 * 60 * 60,
    );
  });

  it('logs and continues when redis invalidate fails', async () => {
    const { service, set, logger } = createService();
    const redisError = new Error('redis unavailable');
    set.mockRejectedValue(redisError);

    await expect(service.invalidate('jti-1')).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      { error: redisError, jti: 'jti-1' },
      'Failed to invalidate session token in redis',
    );
  });

  it('returns true when jti exists in redis', async () => {
    const { service, exists } = createService();
    exists.mockResolvedValue(1);

    await expect(service.isInvalidated('jti-1')).resolves.toBe(true);
    expect(exists).toHaveBeenCalledWith('games-api:session:invalidated:jti-1');
  });

  it('returns false when jti does not exist in redis', async () => {
    const { service, exists } = createService();
    exists.mockResolvedValue(0);

    await expect(service.isInvalidated('jti-1')).resolves.toBe(false);
  });

  it('returns false when redis is unavailable', async () => {
    const { service, exists, logger } = createService();
    const redisError = new Error('redis unavailable');
    exists.mockRejectedValue(redisError);

    await expect(service.isInvalidated('jti-1')).resolves.toBe(false);

    expect(logger.warn).toHaveBeenCalledWith(
      { error: redisError, jti: 'jti-1' },
      'Failed to check session token invalidation; treating as not invalidated',
    );
  });
});
