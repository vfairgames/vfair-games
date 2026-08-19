jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';
import type { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

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

const createService = (prisma: unknown): DashboardService =>
  new DashboardService(prisma as PrismaService);

describe('DashboardService', () => {
  const decimal = (value: number) => ({
    toNumber: () => value,
  });

  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
    partnerCurrency: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    partnerGame: {
      count: jest.fn(),
    },
    player: {
      count: jest.fn(),
    },
    dailyKpi: {
      findMany: jest.fn(),
    },
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
  });

  describe('getMeta', () => {
    it('forces partner users to their partnerId', async () => {
      prisma.partner.findFirst.mockResolvedValue({ id: 10, name: 'Acme' });
      prisma.partnerCurrency.findMany.mockResolvedValue([
        { code: 'EUR', decimals: 2 },
        { code: 'USD', decimals: 2 },
      ]);
      prisma.dailyKpi.findMany.mockResolvedValue([{ currency: 'USD' }]);
      prisma.player.count.mockResolvedValue(3);
      prisma.partnerGame.count.mockResolvedValue(2);

      const result = await service.getMeta(partnerUser, 99);

      expect(prisma.partner.findFirst).toHaveBeenCalledWith({
        where: { id: 10, deletedAt: null },
        select: { id: true, name: true },
      });
      expect(result.partner).toEqual({ id: 10, name: 'Acme' });
      expect(result.currencies.map((c) => c.code)).toEqual(['USD', 'EUR']);
      expect(result.playerCount).toBe(3);
      expect(result.enabledGameCount).toBe(2);
    });

    it('requires partnerId for admin users', async () => {
      await expect(service.getMeta(adminUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns 404 when partner is missing', async () => {
      prisma.partner.findFirst.mockResolvedValue(null);

      await expect(service.getMeta(adminUser, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getKpi', () => {
    it('aggregates partner-scoped daily kpi', async () => {
      prisma.partner.findFirst.mockResolvedValue({ id: 10, name: 'Acme' });
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
      ]);

      const result = await service.getKpi(partnerUser, {
        currency: 'USD',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(prisma.dailyKpi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scope: 'PARTNER',
            partnerId: 10,
            playerId: 0,
            currency: 'USD',
          }),
        }),
      );
      expect(result.summary).toEqual({
        totalWagered: 100,
        totalWon: 40,
        ggr: 60,
        totalBets: 2,
        avgBet: 50,
        playerRtp: 0.4,
      });
    });

    it('returns 400 when currency is not configured', async () => {
      prisma.partner.findFirst.mockResolvedValue({ id: 5, name: 'Beta' });
      prisma.partnerCurrency.findUnique.mockResolvedValue(null);

      await expect(
        service.getKpi(adminUser, {
          partnerId: 5,
          currency: 'XYZ',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 400 when dateFrom is after dateTo', async () => {
      await expect(
        service.getKpi(partnerUser, {
          currency: 'USD',
          dateFrom: '2026-01-31',
          dateTo: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
