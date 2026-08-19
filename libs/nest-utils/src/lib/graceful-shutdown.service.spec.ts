import type { INestApplication } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  enableGracefulShutdown,
  GracefulShutdownService,
} from './graceful-shutdown.service';

describe('enableGracefulShutdown', () => {
  it('enables Nest shutdown hooks', () => {
    const enableShutdownHooks = vi.fn();
    const app = {
      enableShutdownHooks,
    } as unknown as INestApplication;

    enableGracefulShutdown(app);

    expect(enableShutdownHooks).toHaveBeenCalledTimes(1);
  });
});

describe('GracefulShutdownService', () => {
  it('marks the app as not ready before shutdown', () => {
    const info = vi.fn();
    const logger = { info } as unknown as PinoLogger;
    const shutdown = new GracefulShutdownService(logger);

    expect(shutdown.isReady()).toBe(true);

    shutdown.beforeApplicationShutdown('SIGTERM');

    expect(shutdown.isReady()).toBe(false);
    expect(info).toHaveBeenCalledWith(
      { signal: 'SIGTERM' },
      'Stopping readiness',
    );
  });

  it('logs the shutdown signal with structured fields', () => {
    const info = vi.fn();
    const logger = { info } as unknown as PinoLogger;
    const shutdown = new GracefulShutdownService(logger);

    shutdown.onApplicationShutdown('SIGTERM');

    expect(info).toHaveBeenCalledWith(
      { signal: 'SIGTERM' },
      'Shutting down gracefully',
    );
  });
});
