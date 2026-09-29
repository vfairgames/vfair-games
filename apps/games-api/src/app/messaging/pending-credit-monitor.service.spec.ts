jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@vfair/prisma-client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
  },
}));

import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import { PendingCreditMonitorService } from './pending-credit-monitor.service';

describe('PendingCreditMonitorService', () => {
  const createLogger = () =>
    ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }) as unknown as PinoLogger;

  it('logs each stale pending credit without writing', async () => {
    const logger = createLogger();
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          roundId: BigInt(42),
          partnerId: 1,
          requestId: 'player-1:req-1:win',
          createdAt,
        },
      ]),
    } as unknown as PrismaService;

    const monitor = new PendingCreditMonitorService(logger, prisma);
    await expect(monitor.reportStaleCredits()).resolves.toBe(1);

    expect(logger.error).toHaveBeenCalledWith(
      {
        roundId: '42',
        partnerId: 1,
        requestId: 'player-1:req-1:win',
        createdAt,
      },
      'Stale pending credit; manual reconciliation required',
    );
  });

  it('logs nothing when no credits are stale', async () => {
    const logger = createLogger();
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    const monitor = new PendingCreditMonitorService(logger, prisma);
    await expect(monitor.reportStaleCredits()).resolves.toBe(0);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
