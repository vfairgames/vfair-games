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

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoundStatus, SeedStatus } from '@vfair/prisma-client';
import type { PrismaService } from '../prisma/prisma.service';
import { PartnerRoundService } from './partner-round.service';

const partner = {
  partnerId: 1,
  partnerCode: 'acme',
  ipWhitelist: '*',
};

const baseRound = {
  id: BigInt('42'),
  gameId: 'v_dice',
  status: RoundStatus.WON,
  nonce: 3,
  settledAt: new Date('2025-01-01T00:00:00.000Z'),
  rotation: {
    clientSeed: 'client-seed',
    serverSeed: {
      serverSeedHash: 'seed-hash',
      serverSeed: 'secret-seed',
      status: SeedStatus.ACTIVE,
    },
  },
};

describe('PartnerRoundService', () => {
  const prisma = {
    gameRound: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: PartnerRoundService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PartnerRoundService(prisma);
  });

  it('returns fairness for a partner round with hidden serverSeed before revelation', async () => {
    jest
      .spyOn(prisma.gameRound, 'findFirst')
      .mockResolvedValue(baseRound as never);

    const result = await service.getRoundFairness(partner, '42');

    expect(prisma.gameRound.findFirst).toHaveBeenCalledWith({
      where: {
        id: BigInt('42'),
        partnerId: 1,
        status: {
          not: RoundStatus.FAILED,
        },
      },
      select: expect.objectContaining({
        id: true,
        gameId: true,
        status: true,
        nonce: true,
        settledAt: true,
      }),
    });
    expect(result).toEqual({
      roundId: '42',
      gameId: 'v_dice',
      status: 'won',
      fairness: {
        serverSeedHash: 'seed-hash',
        clientSeed: 'client-seed',
        nonce: 3,
        serverSeed: null,
      },
      settledAt: baseRound.settledAt.getTime(),
    });
  });

  it('includes serverSeed after the linked seed is revealed', async () => {
    jest.spyOn(prisma.gameRound, 'findFirst').mockResolvedValue({
      ...baseRound,
      rotation: {
        ...baseRound.rotation,
        serverSeed: {
          ...baseRound.rotation.serverSeed,
          status: SeedStatus.REVEALED,
        },
      },
    } as never);

    const result = await service.getRoundFairness(partner, '42');

    expect(result.fairness.serverSeed).toBe('secret-seed');
  });

  it('throws when the round is not found for the partner', async () => {
    jest.spyOn(prisma.gameRound, 'findFirst').mockResolvedValue(null as never);

    try {
      await service.getRoundFairness(partner, '42');
      throw new Error('expected getRoundFairness to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toEqual({
        err_code: 'round_not_found',
        message: 'Round not found',
      });
    }
  });

  it('rejects invalid round ids', async () => {
    await expect(
      service.getRoundFairness(partner, 'abc'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.gameRound.findFirst).not.toHaveBeenCalled();
  });
});
