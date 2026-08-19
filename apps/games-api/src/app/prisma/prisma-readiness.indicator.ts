import { Injectable } from '@nestjs/common';
import {
  InjectPinoLogger,
  type PinoLogger,
  type ReadinessIndicator,
} from '@vfair/nest-utils';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaReadinessIndicator implements ReadinessIndicator {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(PrismaReadinessIndicator.name)
    private readonly logger: PinoLogger,
  ) {}

  async checkReadiness(): Promise<void> {
    this.logger.debug('CHECKING PRISMA READINESS');
    await this.prisma.$queryRaw`SELECT 1`;
    this.logger.debug('CHECK PRISMA READINESS PASSED');
  }
}
