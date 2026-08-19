import { Module } from '@nestjs/common';
import { FailedRoundsController } from './failed-rounds.controller';
import { FailedRoundsService } from './failed-rounds.service';

@Module({
  controllers: [FailedRoundsController],
  providers: [FailedRoundsService],
})
export class FailedRoundsModule {}
