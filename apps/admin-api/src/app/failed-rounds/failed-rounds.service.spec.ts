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
  FailedRoundEventAction: {
    SOLVED: 'SOLVED',
    UNSOLVED: 'UNSOLVED',
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    empty: { strings: [''], values: [] },
    join: (values: unknown[], separator = ',') => ({
      strings: ['', ...values.map(() => separator), ''],
      values,
    }),
  },
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';
import type { PrismaService } from '../prisma/prisma.service';
import { FailedRoundsService } from './failed-rounds.service';
import { RoundStatus } from '@vfair/prisma-client';

const adminUser: JwtPayload = {
  sub: '1',
  email: 'admin@example.com',
  role: 'ADMIN',
  partnerId: null,
  permissions: {
    MANAGE_USERS: true,
    MANAGE_PARTNERS: true,
    MANAGE_PLAYERS: true,
  },
};

const partnerUser: JwtPayload = {
  sub: '2',
  email: 'partner@example.com',
  role: 'PARTNER',
  partnerId: 10,
  permissions: {
    MANAGE_USERS: false,
    MANAGE_PARTNERS: false,
    MANAGE_PLAYERS: true,
  },
};

const partnerWithoutScope: JwtPayload = {
  ...partnerUser,
  partnerId: null,
};

const createService = (prisma: unknown): FailedRoundsService =>
  new FailedRoundsService(prisma as PrismaService);

describe('FailedRoundsService', () => {
  const prisma = {
    gameRound: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    failedRoundEvent: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  let service: FailedRoundsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([]);
    service = createService(prisma);
  });

  describe('findAll', () => {
    it('scopes partner users to their partnerId', async () => {
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findAll(partnerUser, { page: 1, limit: 10 });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RoundStatus.FAILED,
            partnerId: 10,
          }),
          take: 11,
        }),
      );
    });

    it('rejects partner users without partnerId', async () => {
      await expect(
        service.findAll(partnerWithoutScope, { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin to filter by optional partnerId', async () => {
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, {
        page: 1,
        limit: 10,
        partnerId: 5,
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RoundStatus.FAILED,
            partnerId: 5,
          }),
        }),
      );
    });

    it('filters solved and unsolved rounds by latest event without loading all ids', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: BigInt(3) }]);
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, {
        page: 1,
        limit: 10,
        solved: true,
      });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [BigInt(3)] } },
        }),
      );

      prisma.$queryRaw.mockClear();
      prisma.gameRound.findMany.mockClear();
      prisma.$queryRaw.mockResolvedValue([{ id: BigInt(3) }]);
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, {
        page: 1,
        limit: 10,
        solved: false,
      });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [BigInt(3)] } },
        }),
      );
    });

    it('returns an empty page when solved filter matches no rounds', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findAll(adminUser, {
        page: 1,
        limit: 10,
        solved: true,
      });

      expect(result).toEqual({ data: [], hasMore: false });
      expect(prisma.gameRound.findMany).not.toHaveBeenCalled();
    });

    it('filters by playerId, externalId, roundId, and requestId', async () => {
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, {
        page: 1,
        limit: 10,
        playerId: 7,
        externalId: 'ext-1',
        roundId: '42',
        requestId: 'player-1:req-1:bet',
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 7,
            player: {
              externalId: {
                contains: 'ext-1',
                mode: 'insensitive',
              },
            },
            id: BigInt(42),
            OR: [
              { requestId: 'player-1:req-1:bet' },
              {
                transactions: {
                  some: { requestId: 'player-1:req-1:bet' },
                },
              },
            ],
          }),
        }),
      );
    });

    it('maps failure details and solved flag from latest event', async () => {
      prisma.gameRound.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          gameId: 'dice',
          betAmount: { toNumber: () => 10 },
          currency: 'USD',
          outcome: {
            failure_stage: 'settle',
            err_code: 'bet_failed',
          },
          settledAt: new Date('2026-07-01T00:00:01.000Z'),
          player: { id: 1, externalId: 'player-1' },
          partner: { id: 10, name: 'Acme' },
          partnerCurrency: { decimals: 2 },
          failedRoundEvents: [{ action: 'SOLVED' }],
        },
      ]);

      const result = await service.findAll(adminUser, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: '1',
            failureStage: 'settle',
            errCode: 'bet_failed',
            betAmount: 10,
            solved: true,
          }),
        ],
        hasMore: false,
      });
    });

    it('sets hasMore when an extra row is returned', async () => {
      prisma.gameRound.findMany.mockResolvedValue(
        Array.from({ length: 11 }, (_, index) => ({
          id: BigInt(index + 1),
          gameId: 'dice',
          betAmount: { toNumber: () => 10 },
          currency: 'USD',
          outcome: null,
          settledAt: null,
          player: { id: 1, externalId: 'player-1' },
          partner: { id: 10, name: 'Acme' },
          partnerCurrency: { decimals: 2 },
          failedRoundEvents: [],
        })),
      );

      const result = await service.findAll(adminUser, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('findOne', () => {
    const failedRound = {
      id: BigInt(1),
      gameId: 'v_dice',
      status: RoundStatus.FAILED,
      betAmount: { toNumber: () => 10 },
      winAmount: { toNumber: () => 5 },
      payoutMultiplier: { toNumber: () => 1.5 },
      balanceAfter: { toNumber: () => 95 },
      currency: 'USD',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:02.000Z'),
      settledAt: new Date('2026-07-01T00:00:01.000Z'),
      nonce: 3,
      outcome: {
        rolledValue: 42,
        failure_stage: 'credit',
        err_code: 'wallet_credit_failed',
      },
      requestId: 'round-request',
      rtp: { toNumber: () => 0.97 },
      partnerCurrency: { decimals: 2 },
      rotation: {
        clientSeed: 'client-seed',
        serverSeed: {
          serverSeedHash: 'server-seed-hash',
          serverSeed: null,
          status: 'ACTIVE',
        },
      },
      player: { id: 1, externalId: 'player-1' },
      partner: { id: 10, name: 'Acme' },
      failedRoundEvents: [],
      transactions: [
        {
          id: BigInt(11),
          type: 'DEBIT',
          status: 'CONFIRMED',
          amount: { toNumber: () => 10 },
          balanceBefore: { toNumber: () => 105 },
          balanceAfter: { toNumber: () => 95 },
          currency: 'USD',
          partnerTransactionId: 'partner-debit',
          requestId: 'debit-request',
          reversesTransactionId: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.500Z'),
          partnerCurrency: { decimals: 2 },
        },
        {
          id: BigInt(12),
          type: 'CREDIT',
          status: 'FAILED',
          amount: { toNumber: () => 5 },
          balanceBefore: null,
          balanceAfter: null,
          currency: 'USD',
          partnerTransactionId: null,
          requestId: 'credit-request',
          reversesTransactionId: BigInt(11),
          createdAt: new Date('2026-07-01T00:00:01.000Z'),
          updatedAt: new Date('2026-07-01T00:00:02.000Z'),
          partnerCurrency: { decimals: 2 },
        },
      ],
    };

    it('returns the failed round with every linked transaction', async () => {
      prisma.gameRound.findFirst.mockResolvedValue(failedRound);

      const result = await service.findOne(partnerUser, BigInt(1));

      expect(prisma.gameRound.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: BigInt(1),
            status: RoundStatus.FAILED,
            partnerId: 10,
          },
        }),
      );
      expect(result).toMatchObject({
        id: '1',
        status: RoundStatus.FAILED,
        failureStage: 'credit',
        errCode: 'wallet_credit_failed',
        player: { id: 1, externalId: 'player-1' },
        partner: { id: 10, name: 'Acme' },
        solved: null,
        events: [],
        fairness: {
          serverSeedHash: 'server-seed-hash',
          clientSeed: 'client-seed',
          nonce: 3,
          serverSeed: null,
        },
        transactions: [
          {
            id: '11',
            status: 'CONFIRMED',
            balanceBefore: 105,
            balanceAfter: 95,
          },
          {
            id: '12',
            status: 'FAILED',
            balanceBefore: null,
            balanceAfter: null,
            reversesTransactionId: '11',
          },
        ],
      });
    });

    it('returns 404 when the failed round is unavailable to the user', async () => {
      prisma.gameRound.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(partnerUser, BigInt(1)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markSolved', () => {
    it('creates a solved event and returns the detail', async () => {
      prisma.gameRound.findFirst
        .mockResolvedValueOnce({
          id: BigInt(1),
          failedRoundEvents: [],
        })
        .mockResolvedValueOnce({
          id: BigInt(1),
          gameId: 'v_dice',
          status: RoundStatus.FAILED,
          betAmount: { toNumber: () => 10 },
          winAmount: null,
          payoutMultiplier: null,
          balanceAfter: null,
          currency: 'USD',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:02.000Z'),
          settledAt: new Date('2026-07-01T00:00:01.000Z'),
          nonce: 3,
          outcome: {
            failure_stage: 'debit',
            err_code: 'wallet_debit_failed',
          },
          requestId: 'round-request',
          rtp: { toNumber: () => 0.97 },
          partnerCurrency: { decimals: 2 },
          rotation: {
            clientSeed: 'client-seed',
            serverSeed: {
              serverSeedHash: 'server-seed-hash',
              serverSeed: null,
              status: 'ACTIVE',
            },
          },
          player: { id: 1, externalId: 'player-1' },
          partner: { id: 10, name: 'Acme' },
          failedRoundEvents: [
            {
              id: 1,
              action: 'SOLVED',
              note: 'Refunded via partner support ticket 123',
              createdAt: new Date('2026-07-21T12:00:00.000Z'),
              createdByUser: { id: 1, email: 'admin@example.com' },
            },
          ],
          transactions: [],
        });
      prisma.failedRoundEvent.create.mockResolvedValue({ id: 1 });

      const result = await service.markSolved(
        adminUser,
        BigInt(1),
        'Refunded via partner support ticket 123',
      );

      expect(prisma.failedRoundEvent.create).toHaveBeenCalledWith({
        data: {
          roundId: BigInt(1),
          action: 'SOLVED',
          note: 'Refunded via partner support ticket 123',
          createdByUserId: 1,
        },
      });
      expect(result).toMatchObject({
        id: '1',
        solved: {
          note: 'Refunded via partner support ticket 123',
          solvedAt: '2026-07-21T12:00:00.000Z',
          solvedBy: { id: 1, email: 'admin@example.com' },
        },
        events: [
          {
            id: 1,
            action: 'SOLVED',
            note: 'Refunded via partner support ticket 123',
            createdBy: { id: 1, email: 'admin@example.com' },
          },
        ],
      });
    });

    it('rejects when the round is already solved', async () => {
      prisma.gameRound.findFirst.mockResolvedValue({
        id: BigInt(1),
        failedRoundEvents: [{ action: 'SOLVED' }],
      });

      await expect(
        service.markSolved(adminUser, BigInt(1), 'Already done'),
      ).rejects.toEqual(expect.any(ConflictException));
      expect(prisma.failedRoundEvent.create).not.toHaveBeenCalled();
    });

    it('scopes partner users when marking solved', async () => {
      prisma.gameRound.findFirst.mockResolvedValue(null);

      await expect(
        service.markSolved(partnerUser, BigInt(1), 'Note'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.gameRound.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: BigInt(1),
            status: RoundStatus.FAILED,
            partnerId: 10,
          },
        }),
      );
    });
  });

  describe('markUnsolved', () => {
    it('appends an unsolved event', async () => {
      prisma.gameRound.findFirst
        .mockResolvedValueOnce({
          id: BigInt(1),
          failedRoundEvents: [{ action: 'SOLVED' }],
        })
        .mockResolvedValueOnce({
          id: BigInt(1),
          gameId: 'v_dice',
          status: RoundStatus.FAILED,
          betAmount: { toNumber: () => 10 },
          winAmount: null,
          payoutMultiplier: null,
          balanceAfter: null,
          currency: 'USD',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:02.000Z'),
          settledAt: new Date('2026-07-01T00:00:01.000Z'),
          nonce: 3,
          outcome: {
            failure_stage: 'debit',
            err_code: 'wallet_debit_failed',
          },
          requestId: 'round-request',
          rtp: { toNumber: () => 0.97 },
          partnerCurrency: { decimals: 2 },
          rotation: {
            clientSeed: 'client-seed',
            serverSeed: {
              serverSeedHash: 'server-seed-hash',
              serverSeed: null,
              status: 'ACTIVE',
            },
          },
          player: { id: 1, externalId: 'player-1' },
          partner: { id: 10, name: 'Acme' },
          failedRoundEvents: [
            {
              id: 2,
              action: 'UNSOLVED',
              note: 'Partner still owes credit',
              createdAt: new Date('2026-07-21T13:00:00.000Z'),
              createdByUser: { id: 1, email: 'admin@example.com' },
            },
            {
              id: 1,
              action: 'SOLVED',
              note: 'Earlier mistaken solve',
              createdAt: new Date('2026-07-21T12:00:00.000Z'),
              createdByUser: { id: 1, email: 'admin@example.com' },
            },
          ],
          transactions: [],
        });
      prisma.failedRoundEvent.create.mockResolvedValue({ id: 2 });

      const result = await service.markUnsolved(
        adminUser,
        BigInt(1),
        'Partner still owes credit',
      );

      expect(prisma.failedRoundEvent.create).toHaveBeenCalledWith({
        data: {
          roundId: BigInt(1),
          action: 'UNSOLVED',
          note: 'Partner still owes credit',
          createdByUserId: 1,
        },
      });
      expect(result).toMatchObject({
        id: '1',
        solved: null,
        events: [
          {
            id: 2,
            action: 'UNSOLVED',
            note: 'Partner still owes credit',
          },
          {
            id: 1,
            action: 'SOLVED',
            note: 'Earlier mistaken solve',
          },
        ],
      });
    });

    it('rejects when the round is not solved', async () => {
      prisma.gameRound.findFirst.mockResolvedValue({
        id: BigInt(1),
        failedRoundEvents: [],
      });

      await expect(
        service.markUnsolved(adminUser, BigInt(1), 'Oops'),
      ).rejects.toEqual(expect.any(ConflictException));
      expect(prisma.failedRoundEvent.create).not.toHaveBeenCalled();
    });
  });
});
