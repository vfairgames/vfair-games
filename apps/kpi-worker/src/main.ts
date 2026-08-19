import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  enableGracefulShutdown,
  exitOnBootstrapFailure,
  wireNestApiLogger,
} from '@vfair/nest-utils';
import './env';
import { AppModule } from './app/app.module';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = wireNestApiLogger(app);

  app.disable('x-powered-by');

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  enableGracefulShutdown(app);
  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
    'Bootstrap',
  );
};

bootstrap().catch(exitOnBootstrapFailure);
