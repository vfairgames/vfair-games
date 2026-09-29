jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@vfair/prisma-client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(
      message: string,
      options: { code: string; clientVersion: string },
    ) {
      super(message);
      this.code = options.code;
    }
  }

  class Decimal {
    private readonly value: string;

    constructor(value: string | number) {
      this.value = String(value);
    }

    toString(): string {
      return this.value;
    }
  }

  return {
    RoundStatus: {
      ACTIVE: 'ACTIVE',
      WON: 'WON',
      LOST: 'LOST',
      FAILED: 'FAILED',
    },
    Prisma: {
      PrismaClientKnownRequestError,
      Decimal,
    },
  };
});

import { GAME_ROUND_SETTLED_EVENT, DICE_GAME_ID } from '@vfair/game-contracts';
import { Prisma, RoundStatus } from '@vfair/prisma-client';
import {
  buildRoundSettledEvent,
  enqueueRoundSettledOutbox,
} from './enqueue-round-settled-outbox';

const round = {
  id: BigInt(42),
  playerId: 7,
  partnerId: 1,
  gameId: DICE_GAME_ID,
  currency: 'USD',
  betAmount: new Prisma.Decimal('1'),
  winAmount: new Prisma.Decimal('0'),
  status: RoundStatus.LOST,
  settledAt: new Date('2026-01-15T12:00:00.000Z'),
};

describe('buildRoundSettledEvent', () => {
  it('builds a settled event for LOST rounds', () => {
    expect(buildRoundSettledEvent(round)).toEqual({
      event: GAME_ROUND_SETTLED_EVENT,
      roundId: '42',
      playerId: 7,
      partnerId: 1,
      gameId: DICE_GAME_ID,
      currency: 'USD',
      betAmount: '1',
      winAmount: '0',
      status: RoundStatus.LOST,
      settledAt: '2026-01-15T12:00:00.000Z',
    });
  });

  it('returns null for rounds that are not finished', () => {
    expect(
      buildRoundSettledEvent({ ...round, status: RoundStatus.ACTIVE }),
    ).toBeNull();
  });
});

describe('enqueueRoundSettledOutbox', () => {
  it('creates an outbox row for finished rounds', async () => {
    const create = jest.fn().mockResolvedValue({ id: BigInt(1) });
    const tx = { kpiOutbox: { create } } as never;

    await expect(enqueueRoundSettledOutbox(tx, round)).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: {
        roundId: BigInt(42),
        payload: expect.objectContaining({
          event: GAME_ROUND_SETTLED_EVENT,
          roundId: '42',
          status: RoundStatus.LOST,
        }),
      },
    });
  });

  it('returns false when outbox row already exists', async () => {
    const create = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const tx = { kpiOutbox: { create } } as never;

    await expect(enqueueRoundSettledOutbox(tx, round)).resolves.toBe(false);
  });

  it('skips rounds that are not finished', async () => {
    const create = jest.fn();
    const tx = { kpiOutbox: { create } } as never;

    await expect(
      enqueueRoundSettledOutbox(tx, {
        ...round,
        status: RoundStatus.FAILED,
      }),
    ).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
