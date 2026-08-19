import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from './prisma.service';
import { PrismaReadinessIndicator } from './prisma-readiness.indicator';

jest.mock('./prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const createLogger = (): PinoLogger =>
  ({ debug: jest.fn() }) as unknown as PinoLogger;

describe('PrismaReadinessIndicator', () => {
  it('queries the database during readiness check', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const indicator = new PrismaReadinessIndicator(prisma, createLogger());

    await indicator.checkReadiness();

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
