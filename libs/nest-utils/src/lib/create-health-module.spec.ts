import { Injectable, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createNestHealthModule } from './create-health-module';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { HealthController } from './health.controller';
import {
  READINESS_INDICATOR,
  type ReadinessIndicator,
} from './readiness-indicator';

@Injectable()
class FirstReadinessIndicator implements ReadinessIndicator {
  async checkReadiness(): Promise<void> {
    return Promise.resolve();
  }
}

@Injectable()
class SecondReadinessIndicator implements ReadinessIndicator {
  async checkReadiness(): Promise<void> {
    return Promise.resolve();
  }
}

type ReadinessAggregateProvider = {
  provide: symbol;
  useFactory: (
    ...indicatorInstances: ReadinessIndicator[]
  ) => ReadinessIndicator[];
  inject: Type<ReadinessIndicator>[];
};

const getReadinessAggregateProvider = (
  module: ReturnType<typeof createNestHealthModule>,
): ReadinessAggregateProvider => {
  const provider = (module.providers ?? []).find(
    (entry): entry is ReadinessAggregateProvider =>
      typeof entry === 'object' &&
      entry !== null &&
      'provide' in entry &&
      entry.provide === READINESS_INDICATOR &&
      'useFactory' in entry,
  );

  if (!provider) {
    throw new Error('Readiness aggregate provider was not registered');
  }

  return provider;
};

describe('createNestHealthModule', () => {
  it('aggregates every indicator into a single injected array', async () => {
    const healthModule = createNestHealthModule({
      indicators: [FirstReadinessIndicator, SecondReadinessIndicator],
    });
    const aggregateProvider = getReadinessAggregateProvider(healthModule);

    expect(aggregateProvider.inject).toEqual([
      FirstReadinessIndicator,
      SecondReadinessIndicator,
    ]);

    const testingModule = await Test.createTestingModule({
      providers: [
        ...(healthModule.providers ?? []),
        {
          provide: getLoggerToken(HealthController.name),
          useValue: { error: vi.fn() },
        },
        HealthController,
      ],
    })
      .overrideProvider(GracefulShutdownService)
      .useValue({ isReady: () => true } as GracefulShutdownService)
      .compile();

    const indicators =
      testingModule.get<ReadinessIndicator[]>(READINESS_INDICATOR);

    expect(indicators).toHaveLength(2);
    expect(indicators[0]).toBeInstanceOf(FirstReadinessIndicator);
    expect(indicators[1]).toBeInstanceOf(SecondReadinessIndicator);

    await expect(
      testingModule.get(HealthController).getReady(),
    ).resolves.toEqual({ status: 'ok' });
  });

  it('injects an empty indicator array when none are configured', async () => {
    const healthModule = createNestHealthModule();
    const aggregateProvider = getReadinessAggregateProvider(healthModule);

    expect(aggregateProvider.inject).toEqual([]);

    const testingModule = await Test.createTestingModule({
      providers: [
        ...(healthModule.providers ?? []),
        {
          provide: getLoggerToken(HealthController.name),
          useValue: { error: vi.fn() },
        },
        HealthController,
      ],
    })
      .overrideProvider(GracefulShutdownService)
      .useValue({ isReady: () => true } as GracefulShutdownService)
      .compile();

    expect(
      testingModule.get<ReadinessIndicator[]>(READINESS_INDICATOR),
    ).toEqual([]);
  });
});
