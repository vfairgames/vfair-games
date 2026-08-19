import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Partner } from '../auth/partner.decorator';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { PartnerJwtGuard } from '../auth/partner-jwt.guard';
import { VerificationLaunchDto } from './dto/verification-launch.dto';
import { VerificationService } from './verification.service';

@Controller('verification')
@UseGuards(PartnerJwtGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('launch')
  launch(
    @Partner() partner: AuthenticatedPartner,
    @Body() dto: VerificationLaunchDto,
  ) {
    return this.verificationService.launch(partner, dto);
  }
}
