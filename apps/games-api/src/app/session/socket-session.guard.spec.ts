jest.mock('../partner-config/partner-config.service', () => ({
  PartnerConfigService: class PartnerConfigService {},
}));

jest.mock('../partner-config/partner-config-validation', () => ({
  isGameActiveInConfig: jest.fn().mockReturnValue(true),
}));

import type { SessionTokenInvalidationService } from './session-token-invalidation.service';
import { SocketSessionGuard } from './socket-session.guard';
import type { SocketSessionData } from './socket-session';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import { isGameActiveInConfig } from '../partner-config/partner-config-validation';

describe('SocketSessionGuard', () => {
  const partnerCode = 'acme';
  const partnerConfig = {
    partnerId: 2,
    partnerCode,
    gameConfigs: {
      v_dice: { enabled: true, rtp: 97 },
    },
  };

  const createGuard = (
    isInvalidated = jest.fn().mockResolvedValue(false),
    getByPartnerCode = jest.fn().mockResolvedValue(partnerConfig),
  ) =>
    new SocketSessionGuard(
      { isInvalidated } as unknown as SessionTokenInvalidationService,
      { getByPartnerCode } as unknown as PartnerConfigService,
    );

  const createContext = (client: Socket): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => client,
      }),
    }) as ExecutionContext;

  const createSession = (): SocketSessionData['session'] => ({
    sub: '7',
    partnerId: 2,
    partnerCode,
    gameId: 'v_dice',
    externalPlayerId: 'player-7',
    jti: 'jti-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isGameActiveInConfig).mockReturnValue(true);
  });

  it('denies access when session is missing', async () => {
    const isInvalidated = jest.fn();
    const getByPartnerCode = jest.fn();
    const guard = createGuard(isInvalidated, getByPartnerCode);
    const client = { data: {} } as Socket;

    await expect(guard.canActivate(createContext(client))).rejects.toEqual(
      new WsException({
        err_code: 'session_not_found',
        message: 'Session not found',
      }),
    );
    expect(isInvalidated).not.toHaveBeenCalled();
    expect(getByPartnerCode).not.toHaveBeenCalled();
  });

  it('allows access when session is present and not invalidated', async () => {
    const isInvalidated = jest.fn().mockResolvedValue(false);
    const getByPartnerCode = jest.fn().mockResolvedValue(partnerConfig);
    const guard = createGuard(isInvalidated, getByPartnerCode);
    const client = {
      data: { session: createSession() } satisfies SocketSessionData,
    } as Socket;

    await expect(guard.canActivate(createContext(client))).resolves.toBe(true);
    expect(isInvalidated).toHaveBeenCalledWith('jti-1');
    expect(getByPartnerCode).toHaveBeenCalledWith(partnerCode, 2);
    expect(isGameActiveInConfig).toHaveBeenCalledWith(partnerConfig, 'v_dice');
  });

  it('denies access when session token is invalidated', async () => {
    const isInvalidated = jest.fn().mockResolvedValue(true);
    const getByPartnerCode = jest.fn();
    const guard = createGuard(isInvalidated, getByPartnerCode);
    const client = {
      data: { session: createSession() } satisfies SocketSessionData,
    } as Socket;

    await expect(guard.canActivate(createContext(client))).rejects.toEqual(
      new WsException({
        err_code: 'session_denied',
        message: 'Session denied',
      }),
    );
    expect(isInvalidated).toHaveBeenCalledWith('jti-1');
    expect(getByPartnerCode).not.toHaveBeenCalled();
  });

  it('denies access when the game is not active', async () => {
    const isInvalidated = jest.fn().mockResolvedValue(false);
    const getByPartnerCode = jest.fn().mockResolvedValue(partnerConfig);
    jest.mocked(isGameActiveInConfig).mockReturnValue(false);
    const guard = createGuard(isInvalidated, getByPartnerCode);
    const client = {
      data: { session: createSession() } satisfies SocketSessionData,
    } as Socket;

    await expect(guard.canActivate(createContext(client))).rejects.toEqual(
      new WsException({
        err_code: 'game_not_available',
        message: 'Game not available',
      }),
    );
    expect(getByPartnerCode).toHaveBeenCalledWith(partnerCode, 2);
    expect(isGameActiveInConfig).toHaveBeenCalledWith(partnerConfig, 'v_dice');
  });

  it('checkSession returns game_not_available when the game is not active', async () => {
    const isInvalidated = jest.fn();
    const getByPartnerCode = jest.fn().mockResolvedValue(partnerConfig);
    jest.mocked(isGameActiveInConfig).mockReturnValue(false);
    const guard = createGuard(isInvalidated, getByPartnerCode);

    await expect(guard.checkSession(createSession())).resolves.toBe(
      'game_not_available',
    );
    expect(isInvalidated).toHaveBeenCalledWith('jti-1');
    expect(getByPartnerCode).toHaveBeenCalledWith(partnerCode, 2);
  });

  it('checkSession returns denied when partner code is missing', async () => {
    const getByPartnerCode = jest.fn();
    const guard = createGuard(jest.fn(), getByPartnerCode);

    await expect(
      guard.checkSession({ ...createSession(), partnerCode: '' }),
    ).resolves.toBe('denied');
    expect(getByPartnerCode).not.toHaveBeenCalled();
  });
});
