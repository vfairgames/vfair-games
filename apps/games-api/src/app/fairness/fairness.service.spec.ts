import type { PinoLogger } from '@vfair/nest-utils';

jest.mock('@vfair/game-contracts', () => {
  const actual = jest.requireActual('@vfair/game-contracts') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    getAvailableGame: jest.fn((gameId: string) =>
      gameId === 'v_dice'
        ? { id: 'v_dice', name: 'Dice' }
        : gameId === 'v_mines'
          ? { id: 'v_mines', name: 'Mines' }
          : undefined,
    ),
  };
});

jest.mock('@vfair/game-math', () => ({
  generateClientSeed: jest.fn(() => 'client-seed'),
  generateServerSeed: jest.fn(() => 'server-seed'),
  hashServerSeed: jest.fn(() => 'hash'),
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@vfair/prisma-client', () => ({
  RoundStatus: {
    ACTIVE: 'ACTIVE',
    WON: 'WON',
    LOST: 'LOST',
    FAILED: 'FAILED',
  },
  SeedStatus: {
    COMMITTED: 'COMMITTED',
    ACTIVE: 'ACTIVE',
    REVEALED: 'REVEALED',
  },
}));

jest.mock('../redis/redis.service', () => ({
  RedisService: class RedisService {},
}));

import { WsException } from '@nestjs/websockets';

import { FairnessService } from './fairness.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';

describe('FairnessService active rounds', () => {
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  } as unknown as PinoLogger;

  const createService = ({
    activeRounds = [] as { gameId: string }[],
  } = {}) => {
    const prisma = {
      gameRound: {
        findMany: jest.fn().mockResolvedValue(activeRounds),
      },
    } as unknown as PrismaService;

    const redisService = {
      client: {
        exists: jest.fn().mockResolvedValue(0),
      },
    } as unknown as RedisService;

    const service = new FairnessService(logger, prisma, redisService);

    return { service, prisma };
  };

  it('returns active rounds with game names', async () => {
    const { service } = createService({
      activeRounds: [{ gameId: 'v_dice' }],
    });

    await expect(service.getActiveRounds(1)).resolves.toEqual({
      games: [{ gameId: 'v_dice', gameName: 'Dice' }],
    });
  });

  it('returns multiple active rounds', async () => {
    const { service } = createService({
      activeRounds: [{ gameId: 'v_dice' }, { gameId: 'v_mines' }],
    });

    await expect(service.getActiveRounds(1)).resolves.toEqual({
      games: [
        { gameId: 'v_dice', gameName: 'Dice' },
        { gameId: 'v_mines', gameName: 'Mines' },
      ],
    });
  });

  it('falls back to gameId when game name is unknown', async () => {
    const { service } = createService({
      activeRounds: [{ gameId: 'v_unknown' }],
    });

    await expect(service.getActiveRounds(1)).resolves.toEqual({
      games: [{ gameId: 'v_unknown', gameName: 'v_unknown' }],
    });
  });

  it('returns an empty list when no active rounds exist', async () => {
    const { service } = createService();

    await expect(service.getActiveRounds(1)).resolves.toEqual({
      games: [],
    });
  });
});

describe('FairnessService withBetSettlementLock', () => {
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  } as unknown as PinoLogger;

  const createService = (set: jest.Mock) => {
    const redisService = {
      client: {
        set,
        eval: jest.fn().mockResolvedValue(1),
      },
    } as unknown as RedisService;

    return new FairnessService(logger, {} as PrismaService, redisService);
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the callback when the lock is free', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const service = createService(set);

    await expect(
      service.withBetSettlementLock(1, async () => 'done'),
    ).resolves.toBe('done');
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('waits and acquires the lock after it is released', async () => {
    const set = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('OK');
    const service = createService(set);

    const resultPromise = service.withBetSettlementLock(1, async () => 'done');
    await jest.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe('done');
    expect(set).toHaveBeenCalledTimes(3);
  });

  it('throws bet_in_progress when the lock stays busy past the wait window', async () => {
    const set = jest.fn().mockResolvedValue(null);
    const service = createService(set);

    const resultPromise = service.withBetSettlementLock(1, async () => 'done');
    void resultPromise.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(3000);

    try {
      await resultPromise;
      throw new Error('expected withBetSettlementLock to reject');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        err_code: 'bet_in_progress',
        message: 'Another bet is currently being settled',
      });
    }

    expect(set.mock.calls.length).toBeGreaterThan(1);
  });

  it('maps redis acquire failures to bet_failed', async () => {
    const set = jest.fn().mockRejectedValue(new Error('redis down'));
    const service = createService(set);

    try {
      await service.withBetSettlementLock(1, async () => 'done');
      throw new Error('expected withBetSettlementLock to reject');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        err_code: 'bet_failed',
        message: 'Bet failed',
      });
    }
  });
});
