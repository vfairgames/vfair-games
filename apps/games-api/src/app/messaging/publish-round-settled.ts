import { RoundStatus } from '@vfair/prisma-client';
import type { RoundWithRelations } from '../bet/round.types';
import type { RoundSettledPublisher } from './round-settled.publisher';

export const publishRoundSettled = async (
  publisher: RoundSettledPublisher,
  round: RoundWithRelations,
): Promise<void> => {
  if (round.status !== RoundStatus.WON && round.status !== RoundStatus.LOST) {
    return;
  }

  const settledAt = round.settledAt ?? new Date();

  await publisher.publish({
    roundId: round.id.toString(),
    playerId: round.playerId,
    partnerId: round.partnerId,
    gameId: round.gameId,
    currency: round.currency,
    betAmount: round.betAmount.toString(),
    winAmount: round.winAmount?.toString() ?? '0',
    status: round.status,
    settledAt: settledAt.toISOString(),
  });
};
