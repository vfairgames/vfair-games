import { HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

type NestExceptionPayload = {
  err_code: string;
  message: string;
};

const isNestExceptionPayload = (
  response: unknown,
): response is NestExceptionPayload =>
  response !== null &&
  typeof response === 'object' &&
  'err_code' in response &&
  'message' in response;

export const mapHttpExceptionToWs = (error: unknown): WsException | null => {
  if (!(error instanceof HttpException)) {
    return null;
  }

  const response = error.getResponse();

  if (!isNestExceptionPayload(response)) {
    return null;
  }

  return new WsException({
    err_code: String(response.err_code),
    message: String(response.message),
  });
};
