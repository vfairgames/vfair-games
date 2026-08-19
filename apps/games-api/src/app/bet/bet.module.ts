import { Module } from '@nestjs/common';
import { FairnessModule } from '../fairness/fairness.module';
import { PartnerConfigModule } from '../partner-config/partner-config.module';
import { PartnerWalletModule } from '../partner-wallet/partner-wallet.module';
import { BetHistoryService } from './bet-history.service';
import { DiceBetService } from './dice-bet.service';
import { LimboBetService } from './limbo-bet.service';
import { MinesBetService } from './mines-bet.service';
import { KenoBetService } from './keno-bet.service';
import { PlinkoBetService } from './plinko-bet.service';
import { PlaceBetSupportService } from './place-bet-support.service';

@Module({
  imports: [PartnerConfigModule, PartnerWalletModule, FairnessModule],
  providers: [
    PlaceBetSupportService,
    DiceBetService,
    LimboBetService,
    MinesBetService,
    PlinkoBetService,
    KenoBetService,
    BetHistoryService,
  ],
  exports: [
    DiceBetService,
    LimboBetService,
    MinesBetService,
    PlinkoBetService,
    KenoBetService,
    BetHistoryService,
  ],
})
export class BetModule {}
