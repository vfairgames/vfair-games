import {
  GAME_ROUND_SETTLED_EVENT,
  type GameRoundSettledEvent,
} from '@vfair/game-contracts';
import { Prisma, RoundStatus } from '@vfair/prisma-client';

export type RoundSettledOutboxSource = {
  id: bigint;
  playerId: number;
  partnerId: number;
  gameId: string;
  currency: string;
  betAmount: Prisma.Decimal;
  winAmount: Prisma.Decimal | null;
  status: RoundStatus;
  settledAt: Date | null;
};

export const buildRoundSettledEvent = (
  round: RoundSettledOutboxSource,
): GameRoundSettledEvent | null => {
  if (round.status !== RoundStatus.WON && round.status !== RoundStatus.LOST) {
    return null;
  }

  const settledAt = round.settledAt ?? new Date();

  return {
    event: GAME_ROUND_SETTLED_EVENT,
    roundId: round.id.toString(),
    playerId: round.playerId,
    partnerId: round.partnerId,
    gameId: round.gameId,
    currency: round.currency,
    betAmount: round.betAmount.toString(),
    winAmount: round.winAmount?.toString() ?? '0',
    status: round.status,
    settledAt: settledAt.toISOString(),
  };
};

export const enqueueRoundSettledOutbox = async (
  tx: Prisma.TransactionClient,
  round: RoundSettledOutboxSource,
): Promise<boolean> => {
  const payload = buildRoundSettledEvent(round);
  if (!payload) {
    return false;
  }

  try {
    await tx.kpiOutbox.create({
      data: {
        roundId: round.id,
        payload,
      },
    });
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return false;
    }

    throw error;
  }
};
