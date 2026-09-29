import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { Prisma } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

const CHECK_INTERVAL_MS = 5 * 60_000;
const BATCH_SIZE = 100;
const STALE_AFTER_MS = 120_000;

type StalePendingCredit = {
  roundId: bigint;
  partnerId: number;
  requestId: string;
  createdAt: Date;
};

// Stale credits are resolved manually; this service only reports them.
@Injectable()
export class PendingCreditMonitorService
  implements OnModuleInit, OnApplicationShutdown
{
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    @InjectPinoLogger(PendingCreditMonitorService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.scheduleNext();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async reportStaleCredits(): Promise<number> {
    const createdBefore = new Date(Date.now() - STALE_AFTER_MS);

    const stale = await this.prisma.$queryRaw<StalePendingCredit[]>(Prisma.sql`
      SELECT
        w."roundId",
        w."partnerId",
        w."requestId",
        w."createdAt"
      FROM "WalletTransaction" w
      WHERE w.type = 'CREDIT'::"WalletTxType"
        AND w.status = 'PENDING'::"WalletTxStatus"
        AND w."createdAt" < ${createdBefore}
      ORDER BY w."createdAt" ASC
      LIMIT ${BATCH_SIZE}
    `);

    for (const row of stale) {
      this.logger.error(
        {
          roundId: row.roundId.toString(),
          partnerId: row.partnerId,
          requestId: row.requestId,
          createdAt: row.createdAt,
        },
        'Stale pending credit; manual reconciliation required',
      );
    }

    return stale.length;
  }

  private scheduleNext(): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.tick();
    }, CHECK_INTERVAL_MS);
  }

  private async tick(): Promise<void> {
    try {
      await this.reportStaleCredits();
    } catch (error: unknown) {
      this.logger.error({ error }, 'Pending credit check failed');
    } finally {
      this.scheduleNext();
    }
  }
}
