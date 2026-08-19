import type { Prisma } from '@vfair/prisma-client';

export const roundRelationsInclude = {
  rotation: {
    include: {
      serverSeed: true,
    },
  },
  partnerCurrency: true,
} satisfies Prisma.GameRoundInclude;

export type RoundWithRelations = Prisma.GameRoundGetPayload<{
  include: typeof roundRelationsInclude;
}>;

export const roundHistorySelect = {
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

export type RoundForHistory = Prisma.GameRoundGetPayload<{
  select: typeof roundHistorySelect;
}>;
