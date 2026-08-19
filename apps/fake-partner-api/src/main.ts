import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  enableGracefulShutdown,
  exitOnBootstrapFailure,
  resolveAllowedCorsOrigin,
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: resolveAllowedCorsOrigin,
    credentials: true,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  enableGracefulShutdown(app);
  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
    'Bootstrap',
  );
};

bootstrap().catch(exitOnBootstrapFailure);
