jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@vfair/app-common', () => {
  const actual = jest.requireActual('@vfair/app-common') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    getCountryByCurrency: (currency: string) =>
      currency === 'USD' ? 'us' : currency.toLowerCase().slice(0, 2),
  };
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { PartnerRuntimeConfig } from './partner-config-validation';
import { PartnerConfigService } from './partner-config.service';
import { buildPartnerPublicAssetUrls } from '@vfair/app-common';

const decimal = (value: number) => ({
  toNumber: () => value,
});

describe('PartnerConfigService', () => {
  const partnerCode = 'acme';
  const config: PartnerRuntimeConfig = {
    partnerId: 1,
    partnerCode,
    lobbyUrl: null,
    webhookUrl: null,
    lightAccentColor: 'blue',
    darkAccentColor: 'violet',
    defaultAppearance: 'light',
    themeSwitcherEnabled: true,
    theme: null,
    logo: null,
    palette: {
      lightAccent: 'blue',
      lightGray: 'slate',
      lightBg: 'white',
      darkAccent: 'violet',
      darkGray: 'slate',
      darkBg: 'black',
    },
    currencyConfigs: {},
    gameConfigs: {},
  };

  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  } as unknown as Redis;

  const redisService = {
    client: redisClient,
  } as unknown as RedisService;

  const logger = {
    warn: jest.fn(),
  } as unknown as PinoLogger;

  let service: PartnerConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PartnerConfigService(prisma, redisService, logger);
  });

  describe('loadFromDatabase', () => {
    it('loads and maps partner runtime config from the database', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: 1,
        code: partnerCode,
        lobbyUrl: 'https://lobby.example.com',
        webhookUrl: 'https://webhook.example.com',
        theme: {
          lightAccent: 'blue',
          lightGray: 'slate',
          lightBg: 'white',
          darkAccent: 'violet',
          darkGray: 'slate',
          darkBg: 'black',
          defaultAppearance: 'light',
          themeSwitcherEnabled: true,
          lightAccentColor: 'blue',
          darkAccentColor: 'violet',
          logoContentType: 'image/png',
          updatedAt: new Date('2026-08-14T12:00:00.000Z'),
        },
        currencies: [
          {
            code: 'USD',
            minBet: decimal(1),
            maxBet: decimal(100),
            maxWin: decimal(1000),
            decimals: 2,
          },
        ],
        games: [
          {
            gameId: 'v_dice',
            enabled: true,
            rtp: 0.98,
          },
        ],
      } as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      const result = await service.getByPartnerCode(partnerCode);
      const assets = buildPartnerPublicAssetUrls({
        partnerCode,
        updatedAt: new Date('2026-08-14T12:00:00.000Z'),
        hasLogo: true,
        baseUrl: 'http://localhost:3000',
      });

      expect(prisma.partner.findFirst).toHaveBeenCalledWith({
        where: { code: partnerCode, deletedAt: null },
        select: expect.objectContaining({
          id: true,
          code: true,
          lobbyUrl: true,
          webhookUrl: true,
        }),
      });
      expect(result).toEqual({
        partnerId: 1,
        partnerCode,
        lobbyUrl: 'https://lobby.example.com',
        webhookUrl: 'https://webhook.example.com',
        lightAccentColor: 'blue',
        darkAccentColor: 'violet',
        defaultAppearance: 'light',
        themeSwitcherEnabled: true,
        theme: assets.theme,
        logo: assets.logo,
        palette: {
          lightAccent: 'blue',
          lightGray: 'slate',
          lightBg: 'white',
          darkAccent: 'violet',
          darkGray: 'slate',
          darkBg: 'black',
        },
        currencyConfigs: {
          USD: {
            currency: 'USD',
            minBet: 1,
            maxBet: 100,
            maxWin: 1000,
            currencyDecimals: 2,
            countryCode: 'US',
          },
        },
        gameConfigs: {
          v_dice: {
            enabled: true,
            rtp: 0.98,
          },
        },
      });
    });

    it('throws when the partner is not found', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue(null as never);

      await expect(
        service.getByPartnerCode(partnerCode),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getByPartnerCode', () => {
    it('returns cached config on redis hit', async () => {
      jest
        .spyOn(redisClient, 'get')
        .mockResolvedValue(JSON.stringify(config) as never);

      const result = await service.getByPartnerCode(partnerCode);

      expect(result).toEqual(config);
      expect(prisma.partner.findFirst).not.toHaveBeenCalled();
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('loads from db and stores in redis on cache miss', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: config.partnerId,
        code: config.partnerCode,
        lobbyUrl: config.lobbyUrl,
        webhookUrl: config.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      const result = await service.getByPartnerCode(partnerCode);

      expect(result.partnerId).toBe(config.partnerId);
      expect(prisma.partner.findFirst).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'games-api:partner:config:acme',
        expect.any(String),
        'EX',
        7200,
      );
    });

    it('reloads from db when cached value is corrupted', async () => {
      jest
        .spyOn(redisClient, 'get')
        .mockResolvedValue('{invalid-json' as never);
      jest.spyOn(redisClient, 'del').mockResolvedValue(1 as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: config.partnerId,
        code: config.partnerCode,
        lobbyUrl: config.lobbyUrl,
        webhookUrl: config.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      const result = await service.getByPartnerCode(partnerCode);

      expect(result.partnerId).toBe(config.partnerId);
      expect(logger.warn).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith(
        'games-api:partner:config:acme',
      );
      expect(prisma.partner.findFirst).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalled();
    });

    it('loads from db when redis read fails', async () => {
      const redisError = new Error('redis unavailable');
      jest.spyOn(redisClient, 'get').mockRejectedValue(redisError as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: config.partnerId,
        code: config.partnerCode,
        lobbyUrl: config.lobbyUrl,
        webhookUrl: config.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      const result = await service.getByPartnerCode(partnerCode);

      expect(result.partnerId).toBe(config.partnerId);
      expect(logger.warn).toHaveBeenCalledWith(
        { error: redisError, partnerCode },
        'Failed to read partner config from cache; loading from database',
      );
      expect(prisma.partner.findFirst).toHaveBeenCalled();
    });

    it('returns loaded config when redis write fails', async () => {
      const redisError = new Error('redis unavailable');
      jest.spyOn(redisClient, 'get').mockResolvedValue(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: config.partnerId,
        code: config.partnerCode,
        lobbyUrl: config.lobbyUrl,
        webhookUrl: config.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'set').mockRejectedValue(redisError as never);

      const result = await service.getByPartnerCode(partnerCode);

      expect(result.partnerId).toBe(config.partnerId);
      expect(logger.warn).toHaveBeenCalledWith(
        { error: redisError, partnerCode },
        'Failed to write partner config to cache',
      );
    });

    it('invalidates stale cache and reloads when partnerId mismatches', async () => {
      const staleConfig = { ...config, partnerId: 99 };
      const get = jest
        .spyOn(redisClient, 'get')
        .mockResolvedValueOnce(JSON.stringify(staleConfig) as never)
        .mockResolvedValueOnce(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: config.partnerId,
        code: config.partnerCode,
        lobbyUrl: config.lobbyUrl,
        webhookUrl: config.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'del').mockResolvedValue(1 as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      const result = await service.getByPartnerCode(partnerCode, 1);

      expect(result.partnerId).toBe(config.partnerId);
      expect(get).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenCalledWith(
        'games-api:partner:config:acme',
      );
      expect(prisma.partner.findFirst).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        {
          partnerCode,
          expectedPartnerId: 1,
          cachedPartnerId: 99,
        },
        'Partner config cache partnerId mismatch; invalidating and reloading',
      );
    });

    it('throws when partnerId still mismatches after reload', async () => {
      const staleConfig = { ...config, partnerId: 99 };
      jest
        .spyOn(redisClient, 'get')
        .mockResolvedValueOnce(JSON.stringify(staleConfig) as never)
        .mockResolvedValueOnce(null as never);
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue({
        id: staleConfig.partnerId,
        code: staleConfig.partnerCode,
        lobbyUrl: staleConfig.lobbyUrl,
        webhookUrl: staleConfig.webhookUrl,
        theme: null,
        currencies: [],
        games: [],
      } as never);
      jest.spyOn(redisClient, 'del').mockResolvedValue(1 as never);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK' as never);

      await expect(
        service.getByPartnerCode(partnerCode, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPartnerSecret', () => {
    it('loads the secret from the database on every call', async () => {
      jest
        .spyOn(prisma.partner, 'findFirst')
        .mockResolvedValueOnce({ secret: 'secret-1' } as never)
        .mockResolvedValueOnce({ secret: 'secret-2' } as never);

      await expect(service.getPartnerSecret(partnerCode)).resolves.toBe(
        'secret-1',
      );
      await expect(service.getPartnerSecret(partnerCode)).resolves.toBe(
        'secret-2',
      );

      expect(prisma.partner.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.partner.findFirst).toHaveBeenCalledWith({
        where: { code: partnerCode, deletedAt: null },
        select: { secret: true },
      });
    });

    it('throws when the partner is not found', async () => {
      jest.spyOn(prisma.partner, 'findFirst').mockResolvedValue(null);

      await expect(
        service.getPartnerSecret(partnerCode),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('invalidateCache', () => {
    it('deletes the redis cache key', async () => {
      jest.spyOn(redisClient, 'del').mockResolvedValue(1 as never);

      await service.invalidateCache(partnerCode);

      expect(redisClient.del).toHaveBeenCalledWith(
        'games-api:partner:config:acme',
      );
    });
  });
});
