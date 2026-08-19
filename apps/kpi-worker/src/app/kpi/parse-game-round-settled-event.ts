import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import { GAME_ROUND_SETTLED_EVENT } from '@vfair/game-contracts';
import { RoundStatus } from '@vfair/prisma-client';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const parseGameRoundSettledEvent = (
  raw: unknown,
): GameRoundSettledEvent => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid game.round.settled payload');
  }

  const payload = raw as Record<string, unknown>;

  if (payload.event !== GAME_ROUND_SETTLED_EVENT) {
    throw new Error(`Unexpected event type: ${String(payload.event)}`);
  }

  if (!isNonEmptyString(payload.roundId)) {
    throw new Error('roundId is required');
  }

  if (!isPositiveInt(payload.playerId)) {
    throw new Error('playerId must be a positive integer');
  }

  if (!isPositiveInt(payload.partnerId)) {
    throw new Error('partnerId must be a positive integer');
  }

  if (!isNonEmptyString(payload.gameId)) {
    throw new Error('gameId is required');
  }

  if (!isNonEmptyString(payload.currency)) {
    throw new Error('currency is required');
  }

  if (!isNonEmptyString(payload.betAmount)) {
    throw new Error('betAmount is required');
  }

  if (!isNonEmptyString(payload.winAmount)) {
    throw new Error('winAmount is required');
  }

  if (
    payload.status !== RoundStatus.WON &&
    payload.status !== RoundStatus.LOST
  ) {
    throw new Error('status must be WON or LOST');
  }

  if (!isNonEmptyString(payload.settledAt)) {
    throw new Error('settledAt is required');
  }

  const settledAt = new Date(payload.settledAt);
  if (Number.isNaN(settledAt.getTime())) {
    throw new Error('settledAt must be a valid ISO date');
  }

  return {
    event: GAME_ROUND_SETTLED_EVENT,
    roundId: payload.roundId,
    playerId: payload.playerId,
    partnerId: payload.partnerId,
    gameId: payload.gameId,
    currency: payload.currency,
    betAmount: payload.betAmount,
    winAmount: payload.winAmount,
    status: payload.status,
    settledAt: settledAt.toISOString(),
  };
};

export const toUtcDateOnly = (isoSettledAt: string): Date => {
  const settledAt = new Date(isoSettledAt);
  return new Date(
    Date.UTC(
      settledAt.getUTCFullYear(),
      settledAt.getUTCMonth(),
      settledAt.getUTCDate(),
    ),
  );
};
