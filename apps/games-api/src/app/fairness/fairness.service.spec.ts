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

jest.mock('../bet/round.mapper', () => ({
  toFairnessState: jest.fn(() => ({ state: 'rotated' })),
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

  const createService = (client: {
    set: jest.Mock;
    eval?: jest.Mock;
  }) => {
    const redisService = {
      client: {
        set: client.set,
        eval: client.eval ?? jest.fn().mockResolvedValue(1),
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
    const service = createService({ set });

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
    const service = createService({ set });

    const resultPromise = service.withBetSettlementLock(1, async () => 'done');
    await jest.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe('done');
    expect(set).toHaveBeenCalledTimes(3);
  });

  it('throws bet_in_progress when the lock stays busy past the wait window', async () => {
    const set = jest.fn().mockResolvedValue(null);
    const service = createService({ set });

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
    const service = createService({ set });

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

  it('refreshes the lock TTL while the callback is running', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const evalMock = jest.fn().mockResolvedValue(1);
    const service = createService({ set, eval: evalMock });

    let releaseHold: (() => void) | undefined;
    const hold = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });

    const resultPromise = service.withBetSettlementLock(1, async () => {
      await hold;
      return 'done';
    });

    await jest.advanceTimersByTimeAsync(20_000);

    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('expire'),
      1,
      'games-api:player:1:bet-settlement',
      expect.any(String),
      '60',
    );

    releaseHold?.();
    await expect(resultPromise).resolves.toBe('done');
  });
});

describe('FairnessService rotateFairness', () => {
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  } as unknown as PinoLogger;

  const lockedRotationRow = {
    id: 7,
    clientSeed: 'old-client',
    nonceCount: 3,
    sequence: 1,
    serverSeedId: 11,
    seedId: 11,
    serverSeed: 'secret',
    serverSeedHash: 'hash',
    seedStatus: 'ACTIVE',
  };

  const createService = ({
    activeRoundsBeforeLock = [] as { gameId: string }[],
    activeRoundsInTransaction = [] as { gameId: string }[],
  } = {}) => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([lockedRotationRow]),
      gameRound: {
        findMany: jest.fn().mockResolvedValue(activeRoundsInTransaction),
      },
      provablyFairSeed: {
        findFirst: jest.fn().mockResolvedValue({ id: 12 }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      fairnessRotation: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 8 }),
      },
    };
    const prisma = {
      gameRound: {
        findMany: jest.fn().mockResolvedValue(activeRoundsBeforeLock),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const redis = {
      exists: jest.fn().mockResolvedValue(0),
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    const redisService = { client: redis } as unknown as RedisService;

    const service = new FairnessService(logger, prisma, redisService);

    return { service, tx, redis };
  };

  it('rotates seeds under the bet settlement lock', async () => {
    const { service, tx, redis } = createService();

    await expect(
      service.rotateFairness(1, { clientSeed: 'new-client' }),
    ).resolves.toEqual({ state: 'rotated' });

    expect(redis.set).toHaveBeenCalledWith(
      'games-api:player:1:bet-settlement',
      expect.any(String),
      'EX',
      60,
      'NX',
    );
    expect(tx.provablyFairSeed.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ status: 'REVEALED' }),
      }),
    );
  });

  it('does not reveal the seed when a round opens after the pre-check', async () => {
    const { service, tx, redis } = createService({
      activeRoundsInTransaction: [{ gameId: 'v_mines' }],
    });

    try {
      await service.rotateFairness(1, { clientSeed: 'new-client' });
      throw new Error('expected rotateFairness to reject');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        err_code: 'active_round_exists',
        message: 'Finish the active round before rotating seeds',
        games: [{ gameId: 'v_mines', gameName: 'Mines' }],
      });
    }

    expect(tx.provablyFairSeed.update).not.toHaveBeenCalled();
    expect(tx.fairnessRotation.update).not.toHaveBeenCalled();
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('del'),
      1,
      'games-api:player:1:bet-settlement',
      expect.any(String),
    );
  });
});
