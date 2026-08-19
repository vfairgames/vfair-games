import { Injectable, NotFoundException } from '@nestjs/common';
import type { PartnerRoundFairnessResponse } from '@vfair/game-contracts';
import { RoundStatus, type Prisma } from '@vfair/prisma-client';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { buildFairnessSnapshot, mapRoundStatus } from '../bet/round.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { parseRoundId } from './parse-round-id';

const partnerRoundFairnessSelect = {
  id: true,
  gameId: true,
  status: true,
  nonce: true,
  settledAt: true,
  rotation: {
    select: {
      clientSeed: true,
      serverSeed: {
        select: {
          serverSeedHash: true,
          serverSeed: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.GameRoundSelect;

type PartnerRoundFairnessRow = Prisma.GameRoundGetPayload<{
  select: typeof partnerRoundFairnessSelect;
}>;

@Injectable()
export class PartnerRoundService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoundFairness(
    partner: AuthenticatedPartner,
    roundIdValue: string,
  ): Promise<PartnerRoundFairnessResponse> {
    const roundId = parseRoundId(roundIdValue);

    const round = await this.prisma.gameRound.findFirst({
      where: {
        id: roundId,
        partnerId: partner.partnerId,
        status: {
          not: RoundStatus.FAILED,
        },
      },
      select: partnerRoundFairnessSelect,
    });

    if (!round) {
      throw new NotFoundException({
        err_code: 'round_not_found',
        message: 'Round not found',
      });
    }

    return this.mapRoundFairness(round);
  }

  private mapRoundFairness(
    round: PartnerRoundFairnessRow,
  ): PartnerRoundFairnessResponse {
    return {
      roundId: round.id.toString(),
      gameId: round.gameId,
      status: mapRoundStatus(round.status),
      fairness: buildFairnessSnapshot(round.rotation, round.nonce),
      settledAt: round.settledAt?.getTime() ?? null,
    };
  }
}
