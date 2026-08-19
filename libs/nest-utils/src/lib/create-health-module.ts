import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { HealthController } from './health.controller';
import {
  READINESS_INDICATOR,
  type ReadinessIndicator,
} from './readiness-indicator';

export type NestHealthModuleOptions = {
  indicators?: Type<ReadinessIndicator>[];
};

@Module({})
class NestHealthRootModule {}

export const createNestHealthModule = (
  options: NestHealthModuleOptions = {},
): DynamicModule => {
  const indicators = options.indicators ?? [];

  return {
    module: NestHealthRootModule,
    controllers: [HealthController],
    providers: [
      GracefulShutdownService,
      ...indicators,
      {
        provide: READINESS_INDICATOR,
        useFactory: (...indicatorInstances: ReadinessIndicator[]) =>
          indicatorInstances,
        inject: indicators,
      },
    ],
  };
};
