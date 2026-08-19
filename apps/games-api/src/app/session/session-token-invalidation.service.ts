import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { RedisService } from '../redis/redis.service';

const INVALIDATED_TOKEN_TTL_SECONDS = 12 * 60 * 60;

const invalidatedTokenKey = (jti: string): string =>
  `games-api:session:invalidated:${jti}`;

@Injectable()
export class SessionTokenInvalidationService {
  constructor(
    private readonly redisService: RedisService,
    @InjectPinoLogger(SessionTokenInvalidationService.name)
    private readonly logger: PinoLogger,
  ) {}

  async invalidate(jti: string): Promise<void> {
    try {
      await this.redisService.client.set(
        invalidatedTokenKey(jti),
        '1',
        'EX',
        INVALIDATED_TOKEN_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.warn(
        { error, jti },
        'Failed to invalidate session token in redis',
      );
    }
  }

  async isInvalidated(jti: string): Promise<boolean> {
    try {
      return (
        (await this.redisService.client.exists(invalidatedTokenKey(jti))) === 1
      );
    } catch (error: unknown) {
      this.logger.warn(
        { error, jti },
        'Failed to check session token invalidation; treating as not invalidated',
      );
      return false;
    }
  }
}
