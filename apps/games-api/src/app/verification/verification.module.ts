import { Module } from '@nestjs/common';
import { PartnerAuthModule } from '../auth/partner-auth.module';
import { VerificationContentController } from './verification-content.controller';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [PartnerAuthModule],
  controllers: [VerificationController, VerificationContentController],
  providers: [VerificationService],
})
export class VerificationModule {}
