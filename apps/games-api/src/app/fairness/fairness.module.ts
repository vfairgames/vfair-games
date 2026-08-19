import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { FairnessService } from './fairness.service';

@Module({
  imports: [RedisModule],
  providers: [FairnessService],
  exports: [FairnessService],
})
export class FairnessModule {}
