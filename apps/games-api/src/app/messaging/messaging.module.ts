import { Global, Module } from '@nestjs/common';
import { KpiOutboxReconcilerService } from './kpi-outbox-reconciler.service';
import { KpiOutboxRelayService } from './kpi-outbox-relay.service';
import { RoundSettledPublisher } from './round-settled.publisher';

@Global()
@Module({
  providers: [
    RoundSettledPublisher,
    KpiOutboxRelayService,
    KpiOutboxReconcilerService,
  ],
  exports: [RoundSettledPublisher],
})
export class MessagingModule {}
