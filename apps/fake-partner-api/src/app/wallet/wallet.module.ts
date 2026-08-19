import { Module } from '@nestjs/common';
import { PartnerAuthModule } from './partner-auth.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [PartnerAuthModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
