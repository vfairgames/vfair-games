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
  WalletTxType: {
    DEBIT: 'DEBIT',
    CREDIT: 'CREDIT',
    ROLLBACK: 'ROLLBACK',
  },
  WalletTxStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
    ROLLED_BACK: 'ROLLED_BACK',
  },
}));

import { RoundStatus, SeedStatus } from '@vfair/prisma-client';
import {
  buildFairnessSnapshot,
  InternalRoundMappingError,
  mapFailedRoundFallback,
  mapGameRoundToBetResult,
  mapRoundStatus,
} from './round.mapper';
import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
} from '@vfair/game-contracts';

const rotation = (
  status: (typeof SeedStatus)[keyof typeof SeedStatus],
): {
  clientSeed: string;
  serverSeed: {
    serverSeedHash: string;
    serverSeed: string;
    status: (typeof SeedStatus)[keyof typeof SeedStatus];
  };
} => ({
  clientSeed: 'client-seed',
  serverSeed: {
    serverSeedHash: 'seed-hash',
    serverSeed: 'secret-seed',
    status,
  },
});

const decimal = (value: number) => ({
  toNumber: () => value,
  toString: () => String(value),
});

describe('mapRoundStatus', () => {
  it('maps prisma round statuses to bet statuses', () => {
    expect(mapRoundStatus(RoundStatus.WON)).toBe('won');
    expect(mapRoundStatus(RoundStatus.LOST)).toBe('lost');
    expect(mapRoundStatus(RoundStatus.ACTIVE)).toBe('active');
  });

  it('rejects internal failed round status', () => {
    expect(() => mapRoundStatus(RoundStatus.FAILED)).toThrow(
      InternalRoundMappingError,
    );
  });
});

describe('buildFairnessSnapshot', () => {
  it('hides serverSeed until the seed is revealed', () => {
    expect(buildFairnessSnapshot(rotation(SeedStatus.ACTIVE), 4)).toEqual({
      serverSeedHash: 'seed-hash',
      clientSeed: 'client-seed',
      nonce: 4,
      serverSeed: null,
    });
  });

  it('includes serverSeed after revelation', () => {
    expect(buildFairnessSnapshot(rotation(SeedStatus.REVEALED), 4)).toEqual({
      serverSeedHash: 'seed-hash',
      clientSeed: 'client-seed',
      nonce: 4,
      serverSeed: 'secret-seed',
    });
  });
});

describe('mapGameRoundToBetResult', () => {
  it('maps a dice round outcome', () => {
    const result = mapGameRoundToBetResult({
      id: BigInt(1),
      gameId: DICE_GAME_ID,
      status: RoundStatus.WON,
      betAmount: decimal(1),
      winAmount: decimal(2),
      balanceAfter: decimal(12),
      currency: 'USD',
      nonce: 3,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        rolledValue: 40,
        sliderValue: 50,
        gameMode: 'rollUnder',
        multiplier: 1.96,
        winChance: 50,
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.gameId).toBe(DICE_GAME_ID);
    expect(result.status).toBe('won');
    expect(result.gameData).toEqual({
      rolledValue: 40,
      sliderValue: 50,
      gameMode: 'rollUnder',
      multiplier: 1.96,
      winChance: 50,
    });
  });

  it('maps a limbo round outcome', () => {
    const result = mapGameRoundToBetResult({
      id: BigInt(2),
      gameId: LIMBO_GAME_ID,
      status: RoundStatus.LOST,
      betAmount: decimal(1),
      winAmount: decimal(0),
      balanceAfter: decimal(9),
      currency: 'USD',
      nonce: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        rolledMultiplier: 1.63,
        targetMultiplier: 2,
        winChance: 49,
        multiplier: 0,
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.gameId).toBe(LIMBO_GAME_ID);
    expect(result.status).toBe('lost');
    expect(result.cashOut).toBe(0);
    expect(result.gameData).toEqual({
      rolledMultiplier: 1.63,
      targetMultiplier: 2,
      winChance: 49,
      multiplier: 0,
    });
  });

  it('maps an active mines round and strips mineLayout', () => {
    const result = mapGameRoundToBetResult({
      id: BigInt(3),
      gameId: MINES_GAME_ID,
      status: RoundStatus.ACTIVE,
      betAmount: decimal(1),
      winAmount: null,
      balanceAfter: decimal(9),
      currency: 'USD',
      nonce: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        mineCount: 3,
        gridSize: 25,
        reveals: [{ tile: 4, order: 1, multiplier: 1.08 }],
        multiplier: 1.08,
        mineLayout: [1, 2, 3],
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.gameId).toBe(MINES_GAME_ID);
    expect(result.status).toBe('active');
    expect(result.gameData).toEqual({
      mineCount: 3,
      gridSize: 25,
      reveals: [{ tile: 4, order: 1, multiplier: 1.08 }],
      multiplier: 1.08,
    });
    expect(result.gameData).not.toHaveProperty('mineLayout');
  });

  it('maps a settled mines round with mineLayout', () => {
    const result = mapGameRoundToBetResult({
      id: BigInt(4),
      gameId: MINES_GAME_ID,
      status: RoundStatus.WON,
      betAmount: decimal(1),
      winAmount: decimal(2.16),
      balanceAfter: decimal(11.16),
      currency: 'USD',
      nonce: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        mineCount: 3,
        gridSize: 25,
        reveals: [{ tile: 4, order: 1, multiplier: 1.08 }],
        multiplier: 1.08,
        mineLayout: [1, 2, 3],
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.status).toBe('won');
    expect(result.cashOut).toBe(2.16);
    expect(result).toMatchObject({
      gameId: MINES_GAME_ID,
      gameData: {
        mineLayout: [1, 2, 3],
      },
    });
  });

  it('maps a plinko round outcome with partial return', () => {
    const result = mapGameRoundToBetResult({
      id: BigInt(5),
      gameId: PLINKO_GAME_ID,
      status: RoundStatus.LOST,
      betAmount: decimal(1),
      winAmount: decimal(0.49),
      balanceAfter: decimal(9.49),
      currency: 'USD',
      nonce: 7,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        rows: 16,
        risk: 'medium',
        path: [
          true,
          false,
          false,
          true,
          false,
          true,
          false,
          true,
          false,
          false,
          true,
          false,
          true,
          true,
          false,
          true,
        ],
        bucketIndex: 8,
        multiplier: 0.3,
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.gameId).toBe(PLINKO_GAME_ID);
    expect(result.status).toBe('lost');
    expect(result.cashOut).toBe(0.49);
    expect(result.gameData).toEqual({
      rows: 16,
      risk: 'medium',
      path: [
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        true,
        true,
        false,
        true,
      ],
      bucketIndex: 8,
      multiplier: 0.3,
    });
  });
});

describe('mapFailedRoundFallback', () => {
  it('maps incomplete failed dice outcome without rolledValue', () => {
    const result = mapFailedRoundFallback({
      id: BigInt(5),
      gameId: DICE_GAME_ID,
      status: RoundStatus.FAILED,
      betAmount: decimal(1),
      winAmount: null,
      balanceAfter: decimal(10),
      currency: 'USD',
      nonce: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      outcome: {
        gameMode: 'rollUnder',
        sliderValue: 50,
        multiplier: 1.96,
        winChance: 50,
        failure_stage: 'debit',
      },
      rotation: rotation(SeedStatus.ACTIVE),
      partnerCurrency: { decimals: 2 },
    } as never);

    expect(result.cashOut).toBe(0);
    expect(result.betAmount).toBe(1);
    expect(result.status).toBe('failed');
    expect(result.gameId).toBe(DICE_GAME_ID);
    expect(result.gameData).toEqual({
      gameMode: 'rollUnder',
      sliderValue: 50,
      multiplier: 1.96,
      winChance: 50,
      failure_stage: 'debit',
    });
  });
});
