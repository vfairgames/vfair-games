import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PartnerConfigModule } from '../partner-config/partner-config.module';
import { PartnerWalletClient } from './partner-wallet.client';
import { PartnerWalletService } from './partner-wallet.service';

@Module({
  imports: [PartnerConfigModule, JwtModule.register({})],
  providers: [PartnerWalletClient, PartnerWalletService],
  exports: [PartnerWalletService],
})
export class PartnerWalletModule {}
