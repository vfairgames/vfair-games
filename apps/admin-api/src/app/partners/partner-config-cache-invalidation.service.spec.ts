jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { Redis } from 'ioredis';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';

describe('PartnerConfigCacheInvalidationService', () => {
  const redisClient = {
    del: jest.fn(),
  } as unknown as Redis;

  const redisService = {
    client: redisClient,
  } as unknown as RedisService;

  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const logger = {
    error: jest.fn(),
  } as unknown as PinoLogger;

  let service: PartnerConfigCacheInvalidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PartnerConfigCacheInvalidationService(
      prisma,
      redisService,
      logger,
    );
  });

  it('deletes the partner config cache key by partner id', async () => {
    jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
      code: 'acme',
    } as never);
    jest.spyOn(redisClient, 'del').mockResolvedValue(1 as never);

    await service.invalidateByPartnerId(1);

    expect(redisClient.del).toHaveBeenCalledWith(
      'games-api:partner:config:acme',
    );
  });

  it('does nothing when the partner is not found', async () => {
    jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue(null as never);

    await service.invalidateByPartnerId(1);

    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it('logs redis errors without throwing', async () => {
    jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
      code: 'acme',
    } as never);
    const redisError = new Error('redis unavailable');
    jest.spyOn(redisClient, 'del').mockRejectedValue(redisError as never);

    await expect(service.invalidateByPartnerId(1)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      { error: redisError, partnerId: 1, partnerCode: 'acme' },
      'Failed to invalidate partner config cache',
    );
  });
});
