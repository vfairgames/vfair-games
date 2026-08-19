import { Module } from '@nestjs/common';
import { PartnerAuthModule } from '../auth/partner-auth.module';
import { PartnerRoundController } from './partner-round.controller';
import { PartnerRoundService } from './partner-round.service';

@Module({
  imports: [PartnerAuthModule],
  controllers: [PartnerRoundController],
  providers: [PartnerRoundService],
})
export class PartnerRoundModule {}
