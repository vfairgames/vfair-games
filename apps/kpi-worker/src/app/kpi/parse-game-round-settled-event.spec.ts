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

import { RoundStatus } from '@vfair/prisma-client';
import { GAME_ROUND_SETTLED_EVENT, DICE_GAME_ID } from '@vfair/game-contracts';
import {
  parseGameRoundSettledEvent,
  toUtcDateOnly,
} from './parse-game-round-settled-event';

describe('parseGameRoundSettledEvent', () => {
  const valid = {
    event: GAME_ROUND_SETTLED_EVENT,
    roundId: '42',
    playerId: 7,
    partnerId: 1,
    gameId: DICE_GAME_ID,
    currency: 'USD',
    betAmount: '10',
    winAmount: '0',
    status: RoundStatus.LOST,
    settledAt: '2026-07-09T15:30:00.000Z',
  };

  it('parses a valid payload', () => {
    expect(parseGameRoundSettledEvent(valid)).toEqual(valid);
  });

  it('rejects invalid status', () => {
    expect(() =>
      parseGameRoundSettledEvent({ ...valid, status: RoundStatus.FAILED }),
    ).toThrow('status must be WON or LOST');
  });
});

describe('toUtcDateOnly', () => {
  it('truncates to UTC calendar day', () => {
    const date = toUtcDateOnly('2026-07-09T23:59:59.000Z');
    expect(date.toISOString()).toBe('2026-07-09T00:00:00.000Z');
  });
});
