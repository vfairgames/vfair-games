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

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';
import type { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from './players.service';
import {
  RoundStatus,
  SeedStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';

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

const createService = (prisma: unknown): PlayersService =>
  new PlayersService(prisma as PrismaService);

describe('PlayersService', () => {
  const prisma = {
    player: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    gameRound: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
    },
    partnerCurrency: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    dailyKpi: {
      findMany: jest.fn(),
    },
  };

  let service: PlayersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
  });

  describe('findAll', () => {
    it('scopes partner users to their partnerId', async () => {
      prisma.player.findMany.mockResolvedValue([]);
      prisma.player.count.mockResolvedValue(0);

      await service.findAll(partnerUser, 1, 10);

      expect(prisma.player.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ partnerId: 10 }),
        }),
      );
    });

    it('rejects partner users without partnerId', async () => {
      await expect(
        service.findAll(partnerWithoutScope, 1, 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin to filter by optional partnerId', async () => {
      prisma.player.findMany.mockResolvedValue([]);
      prisma.player.count.mockResolvedValue(0);

      await service.findAll(adminUser, 1, 10, undefined, 5);

      expect(prisma.player.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ partnerId: 5 }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns 404 when partner user requests another partners player', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        externalId: 'ext-1',
        partnerId: 99,
        createdAt: new Date(),
        updatedAt: new Date(),
        partner: { id: 99, name: 'Other' },
      });

      await expect(service.findOne(partnerUser, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findCurrencies', () => {
    it('returns 404 when partner user requests another partners player currencies', async () => {
      prisma.player.findFirst.mockResolvedValue({
        partnerId: 99,
      });

      await expect(
        service.findCurrencies(partnerUser, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('orders currencies with player kpi activity first', async () => {
      prisma.player.findFirst.mockResolvedValue({
        partnerId: 10,
      });
      prisma.partnerCurrency.findMany.mockResolvedValue([
        { code: 'AMD', decimals: 2 },
        { code: 'EUR', decimals: 2 },
        { code: 'USD', decimals: 2 },
      ]);
      prisma.dailyKpi.findMany.mockResolvedValue([{ currency: 'USD' }]);

      const result = await service.findCurrencies(adminUser, 1);

      expect(result.map((row) => row.code)).toEqual(['USD', 'AMD', 'EUR']);
    });
  });

  describe('findRounds', () => {
    it('filters rounds by currency', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findRounds(adminUser, 1, {
        page: 1,
        limit: 10,
        currency: 'USD',
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            currency: 'USD',
          }),
        }),
      );
    });

    it('filters rounds by gameId', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findRounds(adminUser, 1, {
        page: 1,
        limit: 10,
        gameId: 'v_mines',
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            gameId: 'v_mines',
          }),
        }),
      );
    });

    it('filters rounds by roundId', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findRounds(adminUser, 1, {
        page: 1,
        limit: 10,
        roundId: '42',
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            id: BigInt(42),
          }),
        }),
      );
    });

    it('filters failed rounds by status', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findMany.mockResolvedValue([]);

      await service.findRounds(adminUser, 1, {
        page: 1,
        limit: 10,
        status: 'failed',
      });

      expect(prisma.gameRound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            status: { equals: RoundStatus.FAILED },
          }),
        }),
      );
    });

    it('maps active and failed rounds to distinct statuses', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findMany.mockResolvedValue([
        {
          id: BigInt(6),
          betAmount: { toNumber: () => 1 },
          winAmount: null,
          status: RoundStatus.ACTIVE,
          gameId: 'v_mines',
          outcome: { multiplier: 1.08 },
          currency: 'USD',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          partnerCurrency: { decimals: 2 },
        },
        {
          id: BigInt(8),
          betAmount: { toNumber: () => 1 },
          winAmount: null,
          status: RoundStatus.FAILED,
          gameId: 'v_dice',
          outcome: { multiplier: 1.96 },
          currency: 'USD',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          partnerCurrency: { decimals: 2 },
        },
      ]);

      await expect(
        service.findRounds(adminUser, 1, { page: 1, limit: 10 }),
      ).resolves.toMatchObject({
        data: [
          { id: '6', status: 'active' },
          { id: '8', status: 'failed' },
        ],
        hasMore: false,
      });
    });
  });

  describe('findTransactions', () => {
    it('returns 404 when partner user requests another partners player', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 99,
      });

      await expect(
        service.findTransactions(partnerUser, 1, { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('filters transactions by type status currency and roundId', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.walletTransaction.findMany.mockResolvedValue([]);

      await service.findTransactions(adminUser, 1, {
        page: 1,
        limit: 10,
        type: 'debit',
        status: 'confirmed',
        currency: 'USD',
        roundId: '42',
        amountMin: 1,
        amountMax: 100,
      });

      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            type: WalletTxType.DEBIT,
            status: WalletTxStatus.CONFIRMED,
            currency: 'USD',
            roundId: BigInt(42),
            amount: { gte: 1, lte: 100 },
          }),
        }),
      );
    });

    it('maps transaction list items', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.walletTransaction.findMany.mockResolvedValue([
        {
          id: BigInt(7),
          type: WalletTxType.DEBIT,
          status: WalletTxStatus.CONFIRMED,
          amount: { toNumber: () => 10 },
          balanceAfter: { toNumber: () => 90 },
          currency: 'USD',
          roundId: BigInt(42),
          requestId: 'player-1:req-1:bet',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          partnerCurrency: { decimals: 2 },
        },
      ]);

      const result = await service.findTransactions(adminUser, 1, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: [
          {
            id: '7',
            type: WalletTxType.DEBIT,
            status: WalletTxStatus.CONFIRMED,
            amount: 10,
            balanceAfter: 90,
            currency: { code: 'USD', decimals: 2 },
            roundId: '42',
            requestId: 'player-1:req-1:bet',
            createdAt: '2026-07-01T00:00:00.000Z',
          },
        ],
        hasMore: false,
      });
    });
  });

  describe('findRound', () => {
    const decimal = (value: number) => ({
      toNumber: () => value,
    });

    it('returns 404 when partner user requests another partners round', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 99,
      });

      await expect(
        service.findRound(partnerUser, 1, BigInt(100)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns failed detail for incomplete failed outcomes', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.gameRound.findFirst.mockResolvedValue({
        id: BigInt(100),
        gameId: 'v_dice',
        status: RoundStatus.FAILED,
        betAmount: decimal(1),
        winAmount: null,
        balanceAfter: decimal(10),
        currency: 'USD',
        nonce: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        settledAt: new Date('2026-01-01T00:01:00.000Z'),
        requestId: 'player-1:req-1',
        rtp: decimal(0.99),
        outcome: {
          gameMode: 'rollUnder',
          sliderValue: 50,
          multiplier: 1.96,
          winChance: 50,
          failure_stage: 'debit',
        },
        rotation: {
          clientSeed: 'client-seed',
          serverSeed: {
            serverSeedHash: 'seed-hash',
            serverSeed: 'secret-seed',
            status: SeedStatus.ACTIVE,
          },
        },
        partnerCurrency: { decimals: 2 },
      });

      await expect(
        service.findRound(adminUser, 1, BigInt(100)),
      ).resolves.toMatchObject({
        id: '100',
        status: 'failed',
        cashOut: 0,
      });
    });
  });

  describe('findKpi', () => {
    const decimal = (value: number) => ({
      toNumber: () => value,
    });

    it('returns 404 when partner user requests another partners player', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 99,
      });

      await expect(
        service.findKpi(partnerUser, 1, {
          currency: 'USD',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 400 when currency is not configured for the partner', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.partnerCurrency.findUnique.mockResolvedValue(null);

      await expect(
        service.findKpi(adminUser, 1, {
          currency: 'XYZ',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 400 when dateFrom is after dateTo', async () => {
      await expect(
        service.findKpi(adminUser, 1, {
          currency: 'USD',
          dateFrom: '2026-01-31',
          dateTo: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('aggregates daily kpi and game rollups', async () => {
      prisma.player.findFirst.mockResolvedValue({
        id: 1,
        partnerId: 10,
      });
      prisma.partnerCurrency.findUnique.mockResolvedValue({
        code: 'USD',
        decimals: 2,
      });
      prisma.dailyKpi.findMany.mockResolvedValue([
        {
          date: new Date('2026-01-10T00:00:00.000Z'),
          totalWagered: decimal(100),
          totalWon: decimal(40),
          ggr: decimal(60),
          totalBets: 2,
          games: [
            {
              gameId: 'v_dice',
              totalWagered: decimal(100),
              totalWon: decimal(40),
              ggr: decimal(60),
              totalBets: 2,
            },
          ],
        },
        {
          date: new Date('2026-01-11T00:00:00.000Z'),
          totalWagered: decimal(50),
          totalWon: decimal(80),
          ggr: decimal(-30),
          totalBets: 1,
          games: [
            {
              gameId: 'v_dice',
              totalWagered: decimal(30),
              totalWon: decimal(60),
              ggr: decimal(-30),
              totalBets: 1,
            },
            {
              gameId: 'v_mines',
              totalWagered: decimal(20),
              totalWon: decimal(20),
              ggr: decimal(0),
              totalBets: 1,
            },
          ],
        },
      ]);

      const result = await service.findKpi(adminUser, 1, {
        currency: 'USD',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(prisma.dailyKpi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: 1,
            currency: 'USD',
          }),
        }),
      );
      expect(result.currency).toEqual({ code: 'USD', decimals: 2 });
      expect(result.summary).toEqual({
        totalWagered: 150,
        totalWon: 120,
        ggr: 30,
        totalBets: 3,
        avgBet: 50,
        playerRtp: 0.8,
      });
      expect(result.daily).toEqual([
        {
          date: '2026-01-10',
          totalWagered: 100,
          totalWon: 40,
          ggr: 60,
          totalBets: 2,
        },
        {
          date: '2026-01-11',
          totalWagered: 50,
          totalWon: 80,
          ggr: -30,
          totalBets: 1,
        },
      ]);
      expect(result.games).toEqual([
        {
          gameId: 'v_dice',
          gameName: expect.any(String),
          totalWagered: 130,
          totalWon: 100,
          ggr: 30,
          totalBets: 3,
          playerRtp: 100 / 130,
        },
        {
          gameId: 'v_mines',
          gameName: expect.any(String),
          totalWagered: 20,
          totalWon: 20,
          ggr: 0,
          totalBets: 1,
          playerRtp: 1,
        },
      ]);
    });
  });
});
