import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const partnerConfigCacheKey = (partnerCode: string): string =>
  `games-api:partner:config:${partnerCode}`;

@Injectable()
export class PartnerConfigCacheInvalidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectPinoLogger(PartnerConfigCacheInvalidationService.name)
    private readonly logger: PinoLogger,
  ) {}

  async invalidateByPartnerId(partnerId: number): Promise<void> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId },
      select: { code: true },
    });

    if (!partner) {
      return;
    }

    try {
      await this.redisService.client.del(partnerConfigCacheKey(partner.code));
    } catch (error: unknown) {
      this.logger.error(
        { error, partnerId, partnerCode: partner.code },
        'Failed to invalidate partner config cache',
      );
    }
  }
}
