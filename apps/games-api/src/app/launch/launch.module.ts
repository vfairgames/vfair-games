import { Module } from '@nestjs/common';
import { PartnerAuthModule } from '../auth/partner-auth.module';
import { FairnessModule } from '../fairness/fairness.module';
import { SessionModule } from '../session/session.module';
import { LaunchController } from './launch.controller';
import { LaunchService } from './launch.service';

@Module({
  imports: [PartnerAuthModule, SessionModule, FairnessModule],
  controllers: [LaunchController],
  providers: [LaunchService],
})
export class LaunchModule {}
