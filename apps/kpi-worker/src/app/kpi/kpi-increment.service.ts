import { Injectable } from '@nestjs/common';
import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { KpiScope, Prisma } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcDateOnly } from './parse-game-round-settled-event';

type ScopeKey = {
  scope: KpiScope;
  partnerId: number;
  playerId: number;
};

@Injectable()
export class KpiIncrementService {
  constructor(
    @InjectPinoLogger(KpiIncrementService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async processSettledRound(event: GameRoundSettledEvent): Promise<boolean> {
    const roundId = BigInt(event.roundId);
    const date = toUtcDateOnly(event.settledAt);
    const betAmount = new Prisma.Decimal(event.betAmount);
    const winAmount = new Prisma.Decimal(event.winAmount);
    const ggr = betAmount.minus(winAmount);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.kpiProcessedRound.create({
          data: { roundId },
        });

        for (const scopeKey of this.buildScopeKeys(event)) {
          const dailyKpi = await tx.dailyKpi.upsert({
            where: {
              date_scope_partnerId_playerId_currency: {
                date,
                scope: scopeKey.scope,
                partnerId: scopeKey.partnerId,
                playerId: scopeKey.playerId,
                currency: event.currency,
              },
            },
            create: {
              date,
              scope: scopeKey.scope,
              partnerId: scopeKey.partnerId,
              playerId: scopeKey.playerId,
              currency: event.currency,
              totalWagered: betAmount,
              totalWon: winAmount,
              ggr,
              totalBets: 1,
            },
            update: {
              totalWagered: { increment: betAmount },
              totalWon: { increment: winAmount },
              ggr: { increment: ggr },
              totalBets: { increment: 1 },
            },
          });

          await tx.dailyKpiGame.upsert({
            where: {
              dailyKpiId_gameId: {
                dailyKpiId: dailyKpi.id,
                gameId: event.gameId,
              },
            },
            create: {
              dailyKpiId: dailyKpi.id,
              gameId: event.gameId,
              totalWagered: betAmount,
              totalWon: winAmount,
              ggr,
              totalBets: 1,
            },
            update: {
              totalWagered: { increment: betAmount },
              totalWon: { increment: winAmount },
              ggr: { increment: ggr },
              totalBets: { increment: 1 },
            },
          });
        }
      });

      return true;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.info(
          { roundId: event.roundId },
          'Skipping already processed round',
        );
        return false;
      }

      throw error;
    }
  }

  private buildScopeKeys(event: GameRoundSettledEvent): ScopeKey[] {
    return [
      {
        scope: KpiScope.PLAYER,
        partnerId: event.partnerId,
        playerId: event.playerId,
      },
      {
        scope: KpiScope.PARTNER,
        partnerId: event.partnerId,
        playerId: 0,
      },
      {
        scope: KpiScope.GLOBAL,
        partnerId: 0,
        playerId: 0,
      },
    ];
  }
}
