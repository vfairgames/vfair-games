import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DICE_GAME_ID,
  KENO_GAME_ID,
  PLINKO_GAME_ID,
} from '@vfair/game-contracts';
import { DEFAULT_GAME_RTP, UNSUPPORTED_GAME_RTP } from '@vfair/game-math';
import { PartnerGamesService } from './partner-games.service';
import type { PrismaService } from '../prisma/prisma.service';

jest.mock('@vfair/game-contracts', () => {
  const actual = jest.requireActual('@vfair/game-contracts') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    AVAILABLE_GAMES: [
      { id: 'v_dice', name: 'Dice' },
      { id: 'v_plinko', name: 'Plinko' },
      { id: 'v_keno', name: 'Keno' },
    ],
    getAvailableGame: (gameId: string) => {
      if (gameId === 'v_dice') {
        return { id: 'v_dice', name: 'Dice' };
      }
      if (gameId === 'v_plinko') {
        return { id: 'v_plinko', name: 'Plinko' };
      }
      if (gameId === 'v_keno') {
        return { id: 'v_keno', name: 'Keno' };
      }
      return undefined;
    },
  };
});

jest.mock('@vfair/game-math', () => {
  const {
    DEFAULT_GAME_RTP: defaultGameRtp,
    UNSUPPORTED_GAME_RTP: unsupportedGameRtp,
  } = jest.requireActual(
    '../../../../../libs/game-math/src/game-rtp',
  ) as typeof import('../../../../../libs/game-math/src/game-rtp');

  return {
    DEFAULT_GAME_RTP: defaultGameRtp,
    UNSUPPORTED_GAME_RTP: unsupportedGameRtp,
  };
});

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const partnerConfigCacheInvalidation = {
  invalidateByPartnerId: jest.fn(),
};

const createService = (prisma: unknown): PartnerGamesService =>
  new PartnerGamesService(
    prisma as PrismaService,
    partnerConfigCacheInvalidation as never,
  );

describe('PartnerGamesService', () => {
  const partnerId = 1;
  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
    partnerGame: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  let service: PartnerGamesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
    prisma.partner.findFirst.mockResolvedValue({ id: partnerId });
  });

  describe('findOne', () => {
    it('returns default rtp when partner has no game row', async () => {
      prisma.partnerGame.findUnique.mockResolvedValue(null);

      await expect(service.findOne(partnerId, DICE_GAME_ID)).resolves.toEqual({
        gameId: DICE_GAME_ID,
        name: 'Dice',
        enabled: false,
        rtp: DEFAULT_GAME_RTP,
      });
    });

    it('returns unsupported rtp sentinel for keno when partner has no game row', async () => {
      prisma.partnerGame.findUnique.mockResolvedValue(null);

      await expect(service.findOne(partnerId, KENO_GAME_ID)).resolves.toEqual({
        gameId: KENO_GAME_ID,
        name: 'Keno',
        enabled: false,
        rtp: UNSUPPORTED_GAME_RTP,
      });
    });

    it('returns unsupported rtp sentinel for plinko when partner has no game row', async () => {
      prisma.partnerGame.findUnique.mockResolvedValue(null);

      await expect(service.findOne(partnerId, PLINKO_GAME_ID)).resolves.toEqual(
        {
          gameId: PLINKO_GAME_ID,
          name: 'Plinko',
          enabled: false,
          rtp: UNSUPPORTED_GAME_RTP,
        },
      );
    });

    it('returns partner rtp override', async () => {
      prisma.partnerGame.findUnique.mockResolvedValue({
        enabled: true,
        rtp: 0.97,
      });

      await expect(service.findOne(partnerId, DICE_GAME_ID)).resolves.toEqual({
        gameId: DICE_GAME_ID,
        name: 'Dice',
        enabled: true,
        rtp: 0.97,
      });
    });

    it('throws when game is unknown', async () => {
      await expect(
        service.findOne(partnerId, 'unknown'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when partner is missing', async () => {
      prisma.partner.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(partnerId, DICE_GAME_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('requires at least one field', async () => {
      await expect(
        service.update(partnerId, DICE_GAME_ID, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts rtp override', async () => {
      prisma.partnerGame.upsert.mockResolvedValue({});
      prisma.partnerGame.findUnique.mockResolvedValue({
        enabled: false,
        rtp: 0.97,
      });

      await service.update(partnerId, DICE_GAME_ID, { rtp: 0.97 });

      expect(prisma.partnerGame.upsert).toHaveBeenCalledWith({
        where: {
          partnerId_gameId: {
            partnerId,
            gameId: DICE_GAME_ID,
          },
        },
        create: {
          partnerId,
          gameId: DICE_GAME_ID,
          enabled: false,
          rtp: 0.97,
        },
        update: {
          rtp: 0.97,
        },
      });
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });

    it('ignores enabled when null is sent', async () => {
      prisma.partnerGame.upsert.mockResolvedValue({});
      prisma.partnerGame.findUnique.mockResolvedValue({
        enabled: true,
        rtp: 0.97,
      });

      await service.update(partnerId, DICE_GAME_ID, {
        enabled: null as unknown as boolean,
        rtp: 0.97,
      });

      expect(prisma.partnerGame.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { rtp: 0.97 },
        }),
      );
    });

    it('resets rtp to default when null is sent', async () => {
      prisma.partnerGame.upsert.mockResolvedValue({});
      prisma.partnerGame.findUnique.mockResolvedValue({
        enabled: true,
        rtp: DEFAULT_GAME_RTP,
      });

      await service.update(partnerId, DICE_GAME_ID, { rtp: null });

      expect(prisma.partnerGame.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { rtp: DEFAULT_GAME_RTP },
        }),
      );
    });

    it('rejects rtp updates for plinko', async () => {
      await expect(
        service.update(partnerId, PLINKO_GAME_ID, { rtp: 0.97 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.partnerGame.upsert).not.toHaveBeenCalled();
    });

    it('rejects rtp updates for keno', async () => {
      await expect(
        service.update(partnerId, KENO_GAME_ID, { rtp: 0.97 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.partnerGame.upsert).not.toHaveBeenCalled();
    });
  });
});
