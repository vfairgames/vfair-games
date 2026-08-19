import { ServiceUnavailableException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { HealthController } from './health.controller';
import type { ReadinessIndicator } from './readiness-indicator';

const createShutdown = (isReady: boolean): GracefulShutdownService =>
  ({ isReady: () => isReady }) as GracefulShutdownService;

const createLogger = (): PinoLogger =>
  ({ error: vi.fn() }) as unknown as PinoLogger;

describe('HealthController', () => {
  it('returns ok from the liveness endpoint', () => {
    const controller = new HealthController(
      createShutdown(true),
      createLogger(),
    );

    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('returns ok from readiness when the app is ready and indicators pass', async () => {
    const checkReadiness = vi.fn().mockResolvedValue(undefined);
    const indicator = { checkReadiness } as ReadinessIndicator;
    const controller = new HealthController(
      createShutdown(true),
      createLogger(),
      [indicator],
    );

    await expect(controller.getReady()).resolves.toEqual({ status: 'ok' });
    expect(checkReadiness).toHaveBeenCalledTimes(1);
  });

  it('returns ok from readiness when multiple indicators pass', async () => {
    const firstCheckReadiness = vi.fn().mockResolvedValue(undefined);
    const secondCheckReadiness = vi.fn().mockResolvedValue(undefined);
    const controller = new HealthController(
      createShutdown(true),
      createLogger(),
      [
        { checkReadiness: firstCheckReadiness } as ReadinessIndicator,
        { checkReadiness: secondCheckReadiness } as ReadinessIndicator,
      ],
    );

    await expect(controller.getReady()).resolves.toEqual({ status: 'ok' });
    expect(firstCheckReadiness).toHaveBeenCalledTimes(1);
    expect(secondCheckReadiness).toHaveBeenCalledTimes(1);
  });

  it('returns 503 from readiness when the app is shutting down', async () => {
    const controller = new HealthController(
      createShutdown(false),
      createLogger(),
    );

    await expect(controller.getReady()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns 503 from readiness when shutdown starts during indicator checks', async () => {
    let ready = true;
    const shutdown = {
      isReady: () => ready,
    } as GracefulShutdownService;
    const checkReadiness = vi.fn().mockImplementation(async () => {
      ready = false;
    });
    const indicator = { checkReadiness } as ReadinessIndicator;
    const controller = new HealthController(shutdown, createLogger(), [
      indicator,
    ]);

    await expect(controller.getReady()).rejects.toMatchObject({
      response: { status: 'not_ready', reason: 'shutting_down' },
    });
  });

  it('returns 503 from readiness when an indicator fails', async () => {
    const error = new Error('database unavailable');
    const checkReadiness = vi.fn().mockRejectedValue(error);
    const indicator = { checkReadiness } as ReadinessIndicator;
    const logger = createLogger();
    const controller = new HealthController(createShutdown(true), logger, [
      indicator,
    ]);

    await expect(controller.getReady()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(logger.error).toHaveBeenCalledWith(
      { error },
      'Readiness check failed',
    );
  });
});
