import { Module } from '@nestjs/common';
import {
  createNestHealthModule,
  createNestLoggerModule,
} from '@vfair/nest-utils';
import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { LaunchModule } from './launch/launch.module';
import { PartnerAssetsModule } from './partner-assets/partner-assets.module';
import { PartnerConfigModule } from './partner-config/partner-config.module';
import { VerificationModule } from './verification/verification.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaReadinessIndicator } from './prisma/prisma-readiness.indicator';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './session/session.module';
import { FairnessModule } from './fairness/fairness.module';
import { BetModule } from './bet/bet.module';
import { MessagingModule } from './messaging/messaging.module';
import { PartnerRoundModule } from './partner-round/partner-round.module';
import { PartnerWalletModule } from './partner-wallet/partner-wallet.module';

@Module({
  imports: [
    createNestLoggerModule({ appName: 'games-api' }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    PartnerConfigModule,
    PartnerAssetsModule,
    createNestHealthModule({
      indicators: [PrismaReadinessIndicator],
    }),
    LaunchModule,
    VerificationModule,
    SessionModule,
    FairnessModule,
    PartnerWalletModule,
    PartnerRoundModule,
    BetModule,
  ],
  controllers: [AppController],
  providers: [AppGateway, AppService],
})
export class AppModule {}
