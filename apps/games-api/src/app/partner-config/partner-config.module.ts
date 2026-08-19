import { Global, Module } from '@nestjs/common';
import { PartnerConfigService } from './partner-config.service';

@Global()
@Module({
  providers: [PartnerConfigService],
  exports: [PartnerConfigService],
})
export class PartnerConfigModule {}
