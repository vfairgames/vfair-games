import type { Prisma } from '@vfair/prisma-client';

export const roundDetailSelect = {
  id: true,
  gameId: true,
  status: true,
  betAmount: true,
  winAmount: true,
  balanceAfter: true,
  currency: true,
  createdAt: true,
  nonce: true,
  outcome: true,
  requestId: true,
  rtp: true,
  settledAt: true,
  partnerCurrency: {
    select: {
      decimals: true,
    },
  },
  rotation: {
    select: {
      clientSeed: true,
      serverSeed: {
        select: {
          serverSeedHash: true,
          serverSeed: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.GameRoundSelect;

export type RoundForDetail = Prisma.GameRoundGetPayload<{
  select: typeof roundDetailSelect;
}>;
