import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { Prisma, RoundStatus } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import {
  enqueueRoundSettledOutbox,
  type RoundSettledOutboxSource,
} from './enqueue-round-settled-outbox';

const RECONCILE_INTERVAL_MS = 30_000;
const BATCH_SIZE = 100;
const REPUBLISH_AFTER_MS = 120_000;
const MAX_REPUBLISH_ATTEMPTS = 10;
const MISSING_ROUNDS_WINDOW_MS = 24 * 60 * 60 * 1000;

type MissingSettledRound = {
  id: bigint;
  playerId: number;
  partnerId: number;
  gameId: string;
  currency: string;
  betAmount: Prisma.Decimal;
  winAmount: Prisma.Decimal | null;
  status: RoundStatus;
  settledAt: Date | null;
};

@Injectable()
export class KpiOutboxReconcilerService
  implements OnModuleInit, OnApplicationShutdown
{
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private running = false;

  constructor(
    @InjectPinoLogger(KpiOutboxReconcilerService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.scheduleNext(RECONCILE_INTERVAL_MS);
    this.logger.info(
      { reconcileIntervalMs: RECONCILE_INTERVAL_MS, batchSize: BATCH_SIZE },
      'KPI outbox reconciler started',
    );
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async reconcileBatch(): Promise<number> {
    const republished = await this.resendUnprocessedOutbox();
    const enqueued = await this.enqueueMissingSettledRounds();
    return republished + enqueued;
  }

  async resendUnprocessedOutbox(): Promise<number> {
    const publishedBefore = new Date(Date.now() - REPUBLISH_AFTER_MS);

    const result = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "KpiOutbox" AS o
      SET
        "publishedAt" = NULL,
        "attempts" = o."attempts" + 1,
        "lastError" = 'sent again: KPI did not process it'
      WHERE o."publishedAt" IS NOT NULL
        AND o."publishedAt" < ${publishedBefore}
        AND o."attempts" < ${MAX_REPUBLISH_ATTEMPTS}
        AND NOT EXISTS (
          SELECT 1
          FROM "KpiProcessedRound" AS p
          WHERE p."roundId" = o."roundId"
        )
    `);

    const count = Number(result);
    if (count > 0) {
      this.logger.warn(
        { count, publishedBefore },
        'KPI check will send old unprocessed rows again',
      );
    }

    return count;
  }

  async enqueueMissingSettledRounds(): Promise<number> {
    const createdAfter = new Date(Date.now() - MISSING_ROUNDS_WINDOW_MS);

    const missing = await this.prisma.$queryRaw<
      MissingSettledRound[]
    >(Prisma.sql`
      SELECT
        r.id,
        r."playerId",
        r."partnerId",
        r."gameId",
        r.currency,
        r."betAmount",
        r."winAmount",
        r.status,
        r."settledAt"
      FROM "GameRound" r
      LEFT JOIN "KpiProcessedRound" p ON p."roundId" = r.id
      LEFT JOIN "KpiOutbox" o ON o."roundId" = r.id
      WHERE r."createdAt" > ${createdAfter}
        AND r.status IN ('WON'::"RoundStatus", 'LOST'::"RoundStatus")
        AND p."roundId" IS NULL
        AND o."roundId" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "WalletTransaction" w
          WHERE w."roundId" = r.id
            AND w.type = 'CREDIT'::"WalletTxType"
            AND w.status <> 'CONFIRMED'::"WalletTxStatus"
        )
        AND (
          r.status = 'LOST'::"RoundStatus"
          OR EXISTS (
            SELECT 1
            FROM "WalletTransaction" w
            WHERE w."roundId" = r.id
              AND w.type = 'CREDIT'::"WalletTxType"
              AND w.status = 'CONFIRMED'::"WalletTxStatus"
          )
        )
      ORDER BY r.id ASC
      LIMIT ${BATCH_SIZE}
    `);

    let enqueued = 0;

    for (const round of missing) {
      if (this.stopped) {
        break;
      }

      const source: RoundSettledOutboxSource = {
        id: round.id,
        playerId: round.playerId,
        partnerId: round.partnerId,
        gameId: round.gameId,
        currency: round.currency,
        betAmount: round.betAmount,
        winAmount: round.winAmount,
        status: round.status,
        settledAt: round.settledAt,
      };

      const created = await this.prisma.$transaction(async (tx) =>
        enqueueRoundSettledOutbox(tx, source),
      );

      if (created) {
        enqueued += 1;
      }
    }

    if (enqueued > 0) {
      this.logger.info(
        { enqueued, scanned: missing.length },
        'KPI check added missing settled rounds',
      );
    }

    return enqueued;
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) {
      this.scheduleNext(RECONCILE_INTERVAL_MS);
      return;
    }

    this.running = true;

    try {
      await this.reconcileBatch();
    } catch (error: unknown) {
      this.logger.error({ error }, 'KPI outbox check failed');
    } finally {
      this.running = false;
      this.scheduleNext(RECONCILE_INTERVAL_MS);
    }
  }
}
