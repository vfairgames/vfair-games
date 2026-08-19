import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { PartnerRoundFairnessResponse } from '@vfair/game-contracts';
import { Partner } from '../auth/partner.decorator';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { PartnerJwtGuard } from '../auth/partner-jwt.guard';
import { PartnerRoundService } from './partner-round.service';

@Controller('rounds')
@UseGuards(PartnerJwtGuard)
export class PartnerRoundController {
  constructor(private readonly partnerRoundService: PartnerRoundService) {}

  @Get(':roundId/fairness')
  getRoundFairness(
    @Partner() partner: AuthenticatedPartner,
    @Param('roundId') roundId: string,
  ): Promise<PartnerRoundFairnessResponse> {
    return this.partnerRoundService.getRoundFairness(partner, roundId);
  }
}
