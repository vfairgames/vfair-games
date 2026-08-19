import { Module } from '@nestjs/common';
import {
  createNestHealthModule,
  createNestLoggerModule,
} from '@vfair/nest-utils';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaReadinessIndicator } from './prisma/prisma-readiness.indicator';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    createNestLoggerModule({ appName: 'fake-partner-api' }),
    PrismaModule,
    createNestHealthModule({ indicators: [PrismaReadinessIndicator] }),
    AuthModule,
    GamesModule,
    WalletModule,
  ],
})
export class AppModule {}
