import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConflictException, HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import pino from 'pino';
import type { NestPinoHttpOptions } from './nest-logger';
import {
  attachHttpResponseError,
  createNestLoggerParams,
  exitOnBootstrapFailure,
  logWsException,
  wireNestApiLogger,
} from './nest-logger';

const getPinoHttpOptions = (options: {
  appName: string;
  environment?: string;
  logLevel?: string;
  pretty?: boolean;
  redactPaths?: readonly string[];
}): NestPinoHttpOptions =>
  createNestLoggerParams(options).pinoHttp as NestPinoHttpOptions;

const createResponse = (): ServerResponse => {
  const headers = new Map<string, string>();

  return {
    hasHeader: vi.fn((name: string) => headers.has(name)),
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
      return {} as ServerResponse;
    }),
  } as unknown as ServerResponse;
};

describe('createNestLoggerParams', () => {
  it('uses production JSON logging defaults', () => {
    const options = getPinoHttpOptions({
      appName: 'admin-api',
      environment: 'production',
    });

    expect(options.level).toBe('info');
    expect(options.base).toEqual({
      app: 'admin-api',
      environment: 'production',
      pid: process.pid,
    });
    expect(options.transport).toBeUndefined();
  });

  it('uses readable pretty logs in local development', () => {
    const options = getPinoHttpOptions({
      appName: 'games-api',
      environment: 'development',
    });

    expect(options.level).toBe('debug');
    expect(options.transport).toEqual({
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname',
      },
    });
  });

  it('supports explicit log levels and redaction paths', () => {
    const options = getPinoHttpOptions({
      appName: 'admin-api',
      environment: 'production',
      logLevel: 'warn',
      redactPaths: ['session.secret'],
    });

    expect(options.level).toBe('warn');
    expect(options.redact).toMatchObject({
      censor: '[Redacted]',
      paths: expect.arrayContaining([
        'req.headers.authorization',
        'password',
        '*.token',
        'session.secret',
      ]),
    });
  });

  it('rejects invalid log levels', () => {
    expect(() =>
      getPinoHttpOptions({
        appName: 'admin-api',
        environment: 'production',
        logLevel: 'verbose',
      }),
    ).toThrow('Invalid LOG_LEVEL "verbose"');
  });

  it('uses the incoming request id header when present', () => {
    const options = getPinoHttpOptions({
      appName: 'games-api',
      environment: 'production',
    });
    const req = {
      headers: { 'x-request-id': 'request-123' },
    } as unknown as IncomingMessage;
    const res = createResponse();

    expect(options.genReqId?.(req, res)).toBe('request-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'request-123');
  });

  it('generates a request id when the header is missing', () => {
    const options = getPinoHttpOptions({
      appName: 'games-api',
      environment: 'production',
    });
    const req = { headers: {} } as IncomingMessage;
    const res = createResponse();
    const requestId = options.genReqId?.(req, res);

    expect(requestId).toEqual(expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', requestId);
  });

  it('adds err_code to failed request logs', () => {
    const options = getPinoHttpOptions({
      appName: 'admin-api',
      environment: 'production',
    });
    const error = new ConflictException({
      err_code: 'partner_name_already_exists',
      message: 'A partner with this name already exists',
    });

    expect(
      options.customErrorObject?.(
        {} as IncomingMessage,
        {} as ServerResponse,
        error,
        {},
      ),
    ).toMatchObject({
      err_code: 'partner_name_already_exists',
      message: 'A partner with this name already exists',
    });
  });

  it('keeps a single err_code in serialized errors', () => {
    const options = getPinoHttpOptions({
      appName: 'admin-api',
      environment: 'production',
    });
    const serialized = options.serializers?.['error']?.(
      pino.stdSerializers.err(
        new ConflictException({
          err_code: 'partner_name_already_exists',
          message: 'A partner with this name already exists',
        }),
      ),
    );

    expect(serialized).not.toHaveProperty('response');
    expect(serialized).toMatchObject({
      err_code: 'partner_name_already_exists',
      message: 'A partner with this name already exists',
    });
  });

  it('maps plain errors to internal_server_error in failed request logs', () => {
    const options = getPinoHttpOptions({
      appName: 'admin-api',
      environment: 'production',
    });
    const req = {
      method: 'POST',
      url: '/api/partners',
    } as IncomingMessage;
    const error = new Error('database unavailable');

    expect(
      options.customErrorObject?.(req, {} as ServerResponse, error, {}),
    ).toMatchObject({
      err_code: 'internal_server_error',
      message: 'database unavailable',
    });
    expect(options.customErrorMessage?.(req, {} as ServerResponse, error)).toBe(
      'POST /api/partners failed [internal_server_error]',
    );
  });

  it('maps HttpException responses without err_code to internal_server_error', () => {
    const options = getPinoHttpOptions({
      appName: 'games-api',
      environment: 'production',
    });
    const error = new HttpException('Service unavailable', 503);

    expect(
      options.customErrorObject?.(
        {} as IncomingMessage,
        {} as ServerResponse,
        error,
        {},
      ),
    ).toMatchObject({
      err_code: 'internal_server_error',
      message: 'Service unavailable',
    });
  });
});

describe('attachHttpResponseError', () => {
  it('attaches HttpException instances to the response', () => {
    const response: { err?: Error } = {};
    const error = new ConflictException({
      err_code: 'partner_name_already_exists',
      message: 'A partner with this name already exists',
    });

    attachHttpResponseError(response, error);

    expect(response.err).toBe(error);
  });

  it('wraps non-error values before attaching them to the response', () => {
    const response: { err?: Error } = {};

    attachHttpResponseError(response, 'upload failed');

    expect(response.err).toBeInstanceOf(Error);
    expect(response.err?.message).toBe('upload failed');
  });
});

describe('logWsException', () => {
  it('logs websocket failures with err_code', () => {
    const logger = { warn: vi.fn() };

    expect(
      logWsException(
        logger as never,
        new WsException({
          err_code: 'session_denied',
          message: 'Session denied',
        }),
      ),
    ).toEqual({
      err_code: 'session_denied',
      message: 'Session denied',
    });
  });

  it('accepts plain err_code payloads', () => {
    const logger = { warn: vi.fn() };

    expect(
      logWsException(logger as never, {
        err_code: 'missing_session_token',
        message: 'Missing session token',
      }),
    ).toEqual({
      err_code: 'missing_session_token',
      message: 'Missing session token',
    });
  });

  it('maps plain errors to internal_server_error', () => {
    const logger = { warn: vi.fn() };

    expect(
      logWsException(logger as never, new Error('socket handler crashed')),
    ).toEqual({
      err_code: 'internal_server_error',
      message: 'socket handler crashed',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'internal_server_error',
        message: 'socket handler crashed',
        error: expect.any(Error),
      }),
      'WebSocket handler failed',
    );
  });
});

describe('process error logging', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not register fatal handlers outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const on = vi.spyOn(process, 'on');

    wireNestApiLogger({
      get: () => ({ fatal: vi.fn() }),
      useLogger: vi.fn(),
    } as never);

    expect(on).not.toHaveBeenCalled();
    on.mockRestore();
  });

  it('registers fatal handlers for uncaught process errors in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const logger = { fatal: vi.fn() };
    const uncaughtListener = vi.fn();
    const rejectionListener = vi.fn();
    const on = vi.spyOn(process, 'on').mockImplementation((event, listener) => {
      if (event === 'uncaughtException') {
        uncaughtListener.mockImplementation(listener as () => void);
      }

      if (event === 'unhandledRejection') {
        rejectionListener.mockImplementation(listener as () => void);
      }

      return process;
    });
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    wireNestApiLogger({
      get: () => logger,
      useLogger: vi.fn(),
    } as never);
    wireNestApiLogger({
      get: () => logger,
      useLogger: vi.fn(),
    } as never);
    uncaughtListener(new Error('boom'));
    rejectionListener(new Error('rejected'));

    expect(on).toHaveBeenCalledTimes(2);
    expect(logger.fatal).toHaveBeenCalledTimes(2);
    expect(logger.fatal).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        err_code: 'internal_server_error',
        message: 'boom',
        error: expect.any(Error),
      }),
      'Uncaught exception',
    );
    expect(logger.fatal).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        err_code: 'internal_server_error',
        message: 'rejected',
        error: expect.any(Error),
      }),
      'Unhandled rejection',
    );
    expect(exit).toHaveBeenCalledWith(1);

    on.mockRestore();
    exit.mockRestore();
  });

  it('exits when bootstrap fails before the logger is wired', () => {
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    exitOnBootstrapFailure(new Error('startup failed'));

    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });

  it('uses the wired logger when bootstrap fails after wiring', () => {
    const logger = { fatal: vi.fn() };
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    wireNestApiLogger({
      get: () => logger,
      useLogger: vi.fn(),
    } as never);
    exitOnBootstrapFailure(new Error('startup failed'));

    expect(logger.fatal).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'internal_server_error',
        message: 'startup failed',
      }),
      'Bootstrap failed',
    );
    expect(exit).toHaveBeenCalledWith(1);

    exit.mockRestore();
  });
});
