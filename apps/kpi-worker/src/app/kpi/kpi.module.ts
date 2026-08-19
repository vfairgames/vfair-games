import { Module } from '@nestjs/common';
import { KpiIncrementService } from './kpi-increment.service';
import { RoundSettledConsumer } from './round-settled.consumer';

@Module({
  providers: [KpiIncrementService, RoundSettledConsumer],
})
export class KpiModule {}
