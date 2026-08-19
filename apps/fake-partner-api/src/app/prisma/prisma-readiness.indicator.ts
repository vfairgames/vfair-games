import { Injectable } from '@nestjs/common';
import type { ReadinessIndicator } from '@vfair/nest-utils';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaReadinessIndicator implements ReadinessIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async checkReadiness(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
