import { Module } from '@nestjs/common';
import { PartnerAssetsController } from './partner-assets.controller';
import { PartnerAssetsService } from './partner-assets.service';

@Module({
  controllers: [PartnerAssetsController],
  providers: [PartnerAssetsService],
})
export class PartnerAssetsModule {}
