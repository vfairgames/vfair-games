import { Module } from '@nestjs/common';
import {
  createNestHealthModule,
  createNestLoggerModule,
} from '@vfair/nest-utils';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PartnersModule } from './partners/partners.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaReadinessIndicator } from './prisma/prisma-readiness.indicator';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { PlayersModule } from './players/players.module';
import { FailedRoundsModule } from './failed-rounds/failed-rounds.module';

@Module({
  imports: [
    createNestLoggerModule({ appName: 'admin-api' }),
    PrismaModule,
    RedisModule,
    createNestHealthModule({
      indicators: [PrismaReadinessIndicator],
    }),
    AuthModule,
    UsersModule,
    PartnersModule,
    PlayersModule,
    FailedRoundsModule,
    DashboardModule,
  ],
})
export class AppModule {}
