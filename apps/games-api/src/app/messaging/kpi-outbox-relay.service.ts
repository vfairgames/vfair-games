import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RoundSettledPublisher } from './round-settled.publisher';

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 50;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_FAILURES_PER_BATCH = 3;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return String(error).slice(0, 500);
};

@Injectable()
export class KpiOutboxRelayService
  implements OnModuleInit, OnApplicationShutdown
{
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private running = false;
  private consecutiveFailures = 0;

  constructor(
    @InjectPinoLogger(KpiOutboxRelayService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly publisher: RoundSettledPublisher,
  ) {}

  onModuleInit(): void {
    this.scheduleNext(POLL_INTERVAL_MS);
    this.logger.info(
      { pollIntervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE },
      'KPI outbox relay started',
    );
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async processBatch(): Promise<number> {
    if (!this.publisher.isReady()) {
      return 0;
    }

    const rows = await this.prisma.kpiOutbox.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    let published = 0;
    let firstError: unknown = null;
    let failures = 0;

    for (const row of rows) {
      if (this.stopped) {
        break;
      }

      try {
        const payload = row.payload as GameRoundSettledEvent;
        await this.publisher.publish(payload);

        const updated = await this.prisma.kpiOutbox.updateMany({
          where: { id: row.id, publishedAt: null },
          data: {
            publishedAt: new Date(),
            lastError: null,
          },
        });

        if (updated.count > 0) {
          published += 1;
        }
      } catch (error: unknown) {
        this.logger.error(
          {
            error,
            roundId: row.roundId.toString(),
            outboxId: row.id.toString(),
          },
          'Failed to publish KPI outbox row',
        );

        await this.prisma.kpiOutbox
          .update({
            where: { id: row.id },
            data: {
              attempts: { increment: 1 },
              lastError: toErrorMessage(error),
            },
          })
          .catch((updateError: unknown) => {
            this.logger.error(
              { error: updateError, outboxId: row.id.toString() },
              'Failed to record KPI outbox publish failure',
            );
          });

        firstError ??= error;
        failures += 1;

        if (failures >= MAX_FAILURES_PER_BATCH) {
          break;
        }
      }
    }

    if (firstError) {
      throw firstError;
    }

    return published;
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
      this.scheduleNext(POLL_INTERVAL_MS);
      return;
    }

    this.running = true;

    try {
      await this.processBatch();
      this.consecutiveFailures = 0;
      this.scheduleNext(POLL_INTERVAL_MS);
    } catch (error: unknown) {
      this.consecutiveFailures += 1;
      const delayMs = Math.min(
        MAX_BACKOFF_MS,
        BASE_BACKOFF_MS * 2 ** (this.consecutiveFailures - 1),
      );
      this.logger.warn(
        { error, consecutiveFailures: this.consecutiveFailures, delayMs },
        'KPI outbox sender failed; waiting before next try',
      );
      this.scheduleNext(delayMs);
    } finally {
      this.running = false;
    }
  }
}
