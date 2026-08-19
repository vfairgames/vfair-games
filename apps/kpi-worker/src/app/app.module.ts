import { Module } from '@nestjs/common';
import {
  createNestHealthModule,
  createNestLoggerModule,
} from '@vfair/nest-utils';
import { KpiModule } from './kpi/kpi.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaReadinessIndicator } from './prisma/prisma-readiness.indicator';

@Module({
  imports: [
    createNestLoggerModule({ appName: 'kpi-worker' }),
    PrismaModule,
    createNestHealthModule({
      indicators: [PrismaReadinessIndicator],
    }),
    KpiModule,
  ],
})
export class AppModule {}
