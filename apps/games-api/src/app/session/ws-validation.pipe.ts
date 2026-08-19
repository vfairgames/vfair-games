import { ValidationPipe } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export const createWsValidationPipe = (
  errCode: string,
  message: string,
): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () =>
      new WsException({
        err_code: errCode,
        message,
      }),
  });
