import {
  BeforeApplicationShutdown,
  Injectable,
  type INestApplication,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class GracefulShutdownService
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private shuttingDown = false;

  constructor(
    @InjectPinoLogger(GracefulShutdownService.name)
    private readonly logger: PinoLogger,
  ) {}

  isReady(): boolean {
    return !this.shuttingDown;
  }

  beforeApplicationShutdown(signal?: string): void {
    this.shuttingDown = true;
    this.logger.info({ signal }, 'Stopping readiness');
    this.logger.info({ signal }, 'Shutting down gracefully');
  }

  onApplicationShutdown(signal?: string): void {
    this.logger.info({ signal }, 'Shutting down gracefully');
  }
}

export const enableGracefulShutdown = (app: INestApplication): void => {
  app.enableShutdownHooks();
};
