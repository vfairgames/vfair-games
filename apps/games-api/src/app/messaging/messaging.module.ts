import { Global, Module } from '@nestjs/common';
import { RoundSettledPublisher } from './round-settled.publisher';

@Global()
@Module({
  providers: [RoundSettledPublisher],
  exports: [RoundSettledPublisher],
})
export class MessagingModule {}
