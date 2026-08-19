import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { PinoLogger } from '@vfair/nest-utils';
import { WsAcknowledgmentFilter } from './ws-acknowledgment.filter';

describe('WsAcknowledgmentFilter', () => {
  const logger = { warn: jest.fn() } as unknown as PinoLogger;
  const filter = new WsAcknowledgmentFilter(logger);

  const createHost = (args: unknown[]): ArgumentsHost =>
    ({
      getArgByIndex: (index: number) => args[index],
      getArgs: () => args,
      switchToWs: () => ({
        getPattern: () => args[args.length - 1],
      }),
    }) as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acknowledges websocket guard errors to the client callback', () => {
    const callback = jest.fn();
    const host = createHost([
      {},
      { gameId: 'v_mines' },
      callback,
      'session:getBalance',
    ]);

    filter.catch(
      new WsException({
        err_code: 'session_denied',
        message: 'Session denied',
      }),
      host,
    );

    expect(callback).toHaveBeenCalledWith({
      error: {
        err_code: 'session_denied',
        message: 'Session denied',
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'session_denied',
        message: 'Session denied',
        event: 'session:getBalance',
      }),
      'WebSocket handler failed',
    );
  });

  it('acknowledges errors for payload-less emits', () => {
    const callback = jest.fn();
    const host = createHost([{}, undefined, callback, 'mines:getActiveRound']);

    filter.catch(
      new WsException({
        err_code: 'session_not_found',
        message: 'Session not found',
      }),
      host,
    );

    expect(callback).toHaveBeenCalledWith({
      error: {
        err_code: 'session_not_found',
        message: 'Session not found',
      },
    });
  });

  it('logs websocket handler failures when the client callback is missing', () => {
    const host = createHost([
      {},
      { gameId: 'v_mines' },
      undefined,
      'session:getBalance',
    ]);

    filter.catch(
      new WsException({
        err_code: 'session_denied',
        message: 'Session denied',
      }),
      host,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'session_denied',
        message: 'Session denied',
        event: 'session:getBalance',
      }),
      'WebSocket handler failed',
    );
  });
});
