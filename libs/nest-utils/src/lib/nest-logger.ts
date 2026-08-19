import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ArgumentsHost,
  Catch,
  HttpException,
  type INestApplication,
  Module,
  type DynamicModule,
} from '@nestjs/common';
import { APP_FILTER, BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import pino from 'pino';
import type { Options } from 'pino-http';
import {
  LoggerModule,
  Logger as NestPinoLogger,
  type Params,
  type PinoLogger,
} from 'nestjs-pino';

const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

const LOCAL_DEVELOPMENT_ENVIRONMENTS = ['development', 'local'] as const;

const DEFAULT_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'authorization',
  'cookie',
  'password',
  '*.password',
  'body.password',
  'req.body.password',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',
] as const;

type LogLevel = (typeof LOG_LEVELS)[number];

type ErrCodePayload = {
  err_code: string;
  message: string;
};

type FatalLogger = {
  fatal: (obj: Record<string, unknown>, message: string) => void;
};

let bootstrapFatalLogger: FatalLogger | undefined;
let processErrorHandlersRegistered = false;

export type NestPinoHttpOptions = Options & pino.LoggerOptions;

export type NestLoggerOptions = {
  appName: string;
  environment?: string;
  logLevel?: string;
  pretty?: boolean;
  redactPaths?: readonly string[];
};

const readPayloadObject = (body: unknown): ErrCodePayload | undefined => {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  if ('err_code' in body && 'message' in body) {
    return {
      err_code: String(body.err_code),
      message: String(body.message),
    };
  }

  if ('message' in body) {
    const message = (body as { message: string | string[] }).message;

    return {
      err_code: 'validation_failed',
      message: Array.isArray(message) ? message.join('; ') : String(message),
    };
  }

  return undefined;
};

const readErrCode = (exception: unknown): ErrCodePayload => {
  const error =
    typeof exception === 'object' &&
    exception !== null &&
    'raw' in exception &&
    (exception as { raw?: Error }).raw instanceof Error
      ? (exception as { raw: Error }).raw
      : exception;

  if (error instanceof HttpException) {
    const payload = readPayloadObject(error.getResponse());
    if (payload) {
      return payload;
    }

    return { err_code: 'internal_server_error', message: error.message };
  }

  if (error instanceof WsException) {
    const payload = readPayloadObject(error.getError());
    if (payload) {
      return payload;
    }

    return { err_code: 'internal_server_error', message: error.message };
  }

  if (error instanceof Error) {
    return { err_code: 'internal_server_error', message: error.message };
  }

  const directPayload = readPayloadObject(error);
  if (directPayload) {
    return directPayload;
  }

  return { err_code: 'internal_server_error', message: 'Unknown error' };
};

export const attachHttpResponseError = (
  response: unknown,
  exception: unknown,
): void => {
  (response as { err?: Error }).err =
    exception instanceof Error ? exception : new Error(String(exception));
};

const serializeLoggedError = (
  value: Error & { raw?: Error; response?: object },
) => {
  const serialized =
    value.raw !== undefined ? value : pino.stdSerializers.err(value);

  const payload = readPayloadObject(serialized.response);
  if (payload) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { response, ...rest } = serialized;
    return { ...rest, err_code: payload.err_code, message: payload.message };
  }

  return serialized;
};

@Catch()
class AttachExceptionFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      attachHttpResponseError(host.switchToHttp().getResponse(), exception);
    }

    super.catch(exception, host);
  }
}

@Module({})
class NestLoggerRootModule {}

export const wireNestApiLogger = (app: INestApplication): NestPinoLogger => {
  const logger = app.get(NestPinoLogger);
  app.useLogger(logger);
  bootstrapFatalLogger = logger;
  enableProcessErrorLogging(logger);
  return logger;
};

const logFatal = (
  logger: FatalLogger,
  error: unknown,
  message: string,
): void => {
  logger.fatal({ ...readErrCode(error), error }, message);
};

export const logWsException = (
  logger: PinoLogger,
  exception: unknown,
  context?: Record<string, unknown>,
  logMessage = 'WebSocket handler failed',
): ErrCodePayload => {
  const payload = readErrCode(exception);

  logger.warn(
    {
      ...payload,
      ...(exception instanceof Error &&
      !(exception instanceof HttpException) &&
      !(exception instanceof WsException)
        ? { error: exception }
        : {}),
      ...context,
    },
    logMessage,
  );

  return payload;
};

const enableProcessErrorLogging = (logger: FatalLogger): void => {
  if (processErrorHandlersRegistered) {
    return;
  }

  if (normalizeEnvironment(undefined) !== 'production') {
    return;
  }

  processErrorHandlersRegistered = true;

  process.on('uncaughtException', (error) => {
    logFatal(logger, error, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logFatal(logger, reason, 'Unhandled rejection');
    process.exit(1);
  });
};

export const exitOnBootstrapFailure = (error: unknown): never => {
  logFatal(bootstrapFatalLogger ?? pino(), error, 'Bootstrap failed');
  process.exit(1);
};

export const createNestLoggerModule = (
  options: NestLoggerOptions,
): DynamicModule => ({
  module: NestLoggerRootModule,
  imports: [LoggerModule.forRoot(createNestLoggerParams(options))],
  providers: [{ provide: APP_FILTER, useClass: AttachExceptionFilter }],
});

export const createNestLoggerParams = (options: NestLoggerOptions): Params => {
  const environment = normalizeEnvironment(options.environment);
  const logLevel = resolveLogLevel(options.logLevel, environment);
  const pretty = resolvePrettyLogging(options.pretty, environment);
  const pinoHttp: NestPinoHttpOptions = {
    level: logLevel,
    base: {
      app: options.appName,
      environment,
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: serializeLoggedError,
      error: serializeLoggedError,
    },
    redact: {
      paths: [...DEFAULT_REDACT_PATHS, ...(options.redactPaths ?? [])],
      censor: '[Redacted]',
    },
    genReqId: createRequestId,
    customAttributeKeys: {
      reqId: 'requestId',
      err: 'error',
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) {
        return 'error';
      }

      if (res.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
    customSuccessMessage: (req) =>
      `${req.method ?? 'UNKNOWN'} ${req.url ?? '/'} completed`,
    customErrorObject: (_req, _res, error, val) => ({
      ...val,
      ...readErrCode(error),
    }),
    customErrorMessage: (req, _res, error) => {
      const { err_code } = readErrCode(error);
      return `${req.method ?? 'UNKNOWN'} ${req.url ?? '/'} failed [${err_code}]`;
    },
    ...(pretty ? { transport: createPrettyTransport() } : {}),
  };

  return {
    renameContext: 'context',
    assignResponse: true,
    pinoHttp,
  };
};

export const createRequestId = (
  req: IncomingMessage,
  res: ServerResponse,
): string => {
  const requestId =
    resolveHeaderValue(req.headers['x-request-id']) ?? randomUUID();

  if (!res.hasHeader('x-request-id')) {
    res.setHeader('x-request-id', requestId);
  }

  return requestId;
};

const normalizeEnvironment = (environment: string | undefined): string => {
  const value = environment ?? process.env['NODE_ENV'] ?? 'development';
  return value.trim() || 'development';
};

const resolveLogLevel = (
  logLevel: string | undefined,
  environment: string,
): LogLevel => {
  const value = logLevel ?? process.env['LOG_LEVEL'];

  if (!value) {
    return environment === 'production' ? 'info' : 'debug';
  }

  if (isLogLevel(value)) {
    return value;
  }

  throw new Error(
    `Invalid LOG_LEVEL "${value}". Expected one of: ${LOG_LEVELS.join(', ')}`,
  );
};

const isLogLevel = (value: string): value is LogLevel =>
  LOG_LEVELS.includes(value as LogLevel);

const resolvePrettyLogging = (
  pretty: boolean | undefined,
  environment: string,
): boolean =>
  pretty ??
  LOCAL_DEVELOPMENT_ENVIRONMENTS.includes(
    environment as (typeof LOCAL_DEVELOPMENT_ENVIRONMENTS)[number],
  );

const resolveHeaderValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const createPrettyTransport = (): NonNullable<
  pino.LoggerOptions['transport']
> => ({
  target: 'pino-pretty',
  options: {
    colorize: true,
    singleLine: true,
    translateTime: 'SYS:standard',
    ignore: 'hostname',
  },
});
