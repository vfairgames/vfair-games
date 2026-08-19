import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GracefulShutdownService } from './graceful-shutdown.service';
import {
  READINESS_INDICATOR,
  type ReadinessIndicator,
} from './readiness-indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly shutdown: GracefulShutdownService,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
    @Optional()
    @Inject(READINESS_INDICATOR)
    private readonly indicators: ReadinessIndicator[] = [],
  ) {}

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReady(): Promise<{ status: string }> {
    if (!this.shutdown.isReady()) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        reason: 'shutting_down',
      });
    }

    try {
      await Promise.all(
        this.indicators.map((indicator) => indicator.checkReadiness()),
      );
    } catch (error: unknown) {
      this.logger.error({ error }, 'Readiness check failed');
      throw new ServiceUnavailableException({
        status: 'not_ready',
        reason: 'dependency_unavailable ' + String(error),
      });
    }

    if (!this.shutdown.isReady()) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        reason: 'shutting_down',
      });
    }

    return { status: 'ok' };
  }
}
