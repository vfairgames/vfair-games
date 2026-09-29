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
}));
jest.mock('./round-settled.publisher', () => ({
  RoundSettledPublisher: class RoundSettledPublisher {},
}));

import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import { GAME_ROUND_SETTLED_EVENT, DICE_GAME_ID } from '@vfair/game-contracts';
import { RoundStatus } from '@vfair/prisma-client';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import { KpiOutboxRelayService } from './kpi-outbox-relay.service';
import type { RoundSettledPublisher } from './round-settled.publisher';

const payload: GameRoundSettledEvent = {
  event: GAME_ROUND_SETTLED_EVENT,
  roundId: '42',
  playerId: 7,
  partnerId: 1,
  gameId: DICE_GAME_ID,
  currency: 'USD',
  betAmount: '1',
  winAmount: '0',
  status: RoundStatus.LOST,
  settledAt: '2026-01-15T12:00:00.000Z',
};

describe('KpiOutboxRelayService', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  it('publishes unpublished outbox rows and marks them published', async () => {
    const prisma = {
      kpiOutbox: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: BigInt(1), roundId: BigInt(42), payload }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const publisher = {
      isReady: jest.fn().mockReturnValue(true),
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as RoundSettledPublisher;

    const relay = new KpiOutboxRelayService(logger, prisma, publisher);
    await expect(relay.processBatch()).resolves.toBe(1);

    expect(publisher.publish).toHaveBeenCalledWith(payload);
    expect(prisma.kpiOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(1), publishedAt: null },
      data: {
        publishedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('counts the attempt and throws when publish fails', async () => {
    const prisma = {
      kpiOutbox: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: BigInt(1), roundId: BigInt(42), payload }]),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const publisher = {
      isReady: jest.fn().mockReturnValue(true),
      publish: jest.fn().mockRejectedValue(new Error('broker down')),
    } as unknown as RoundSettledPublisher;

    const relay = new KpiOutboxRelayService(logger, prisma, publisher);
    await expect(relay.processBatch()).rejects.toThrow('broker down');

    expect(prisma.kpiOutbox.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: {
        attempts: { increment: 1 },
        lastError: 'broker down',
      },
    });
  });

  it('keeps publishing later rows after a row fails', async () => {
    const prisma = {
      kpiOutbox: {
        findMany: jest.fn().mockResolvedValue([
          { id: BigInt(1), roundId: BigInt(42), payload },
          { id: BigInt(2), roundId: BigInt(43), payload },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const publisher = {
      isReady: jest.fn().mockReturnValue(true),
      publish: jest
        .fn()
        .mockRejectedValueOnce(new Error('broker down'))
        .mockResolvedValueOnce(undefined),
    } as unknown as RoundSettledPublisher;

    const relay = new KpiOutboxRelayService(logger, prisma, publisher);
    await expect(relay.processBatch()).rejects.toThrow('broker down');

    expect(prisma.kpiOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(2), publishedAt: null },
      data: {
        publishedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('skips work when the publisher channel is unavailable', async () => {
    const prisma = {
      kpiOutbox: {
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const publisher = {
      isReady: jest.fn().mockReturnValue(false),
      publish: jest.fn(),
    } as unknown as RoundSettledPublisher;

    const relay = new KpiOutboxRelayService(logger, prisma, publisher);
    await expect(relay.processBatch()).resolves.toBe(0);
    expect(prisma.kpiOutbox.findMany).not.toHaveBeenCalled();
  });
});
