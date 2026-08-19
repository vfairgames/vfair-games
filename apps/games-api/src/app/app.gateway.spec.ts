jest.mock('./partner-config/partner-config.service', () => ({
  PartnerConfigService: class PartnerConfigService {},
}));

jest.mock('./session/socket-session.guard', () => ({
  SocketSessionGuard: class SocketSessionGuard {},
}));

jest.mock('./bet/bet-history.service', () => ({
  BetHistoryService: class BetHistoryService {},
}));

jest.mock('./bet/dice-bet.service', () => ({
  DiceBetService: class DiceBetService {},
}));

jest.mock('./bet/limbo-bet.service', () => ({
  LimboBetService: class LimboBetService {},
}));

jest.mock('./bet/mines-bet.service', () => ({
  MinesBetService: class MinesBetService {},
}));

jest.mock('./bet/plinko-bet.service', () => ({
  PlinkoBetService: class PlinkoBetService {},
}));

jest.mock('./bet/keno-bet.service', () => ({
  KenoBetService: class KenoBetService {},
}));

jest.mock('./fairness/fairness.service', () => ({
  FairnessService: class FairnessService {},
}));

jest.mock('./partner-wallet/partner-wallet.service', () => ({
  PartnerWalletService: class PartnerWalletService {},
}));

import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { MINES_GAME_ID } from '@vfair/game-contracts';
import type { PinoLogger } from '@vfair/nest-utils';
import type { Socket } from 'socket.io';
import { AppGateway } from './app.gateway';
import type { BetHistoryService } from './bet/bet-history.service';
import type { DiceBetService } from './bet/dice-bet.service';
import type { LimboBetService } from './bet/limbo-bet.service';
import type { MinesBetService } from './bet/mines-bet.service';
import type { KenoBetService } from './bet/keno-bet.service';
import type { PlinkoBetService } from './bet/plinko-bet.service';
import type { FairnessService } from './fairness/fairness.service';
import type { PartnerWalletService } from './partner-wallet/partner-wallet.service';
import { PartnerConfigService } from './partner-config/partner-config.service';
import type { SocketSessionGuard } from './session/socket-session.guard';
import { readSocketSession } from './session/socket-session';
import { SessionTokenService } from './session/session-token.service';

const partnerCode = 'acme';
const partnerSecret = 'test-partner-secret';

const createToken = async (
  sessionTokenService: SessionTokenService,
  gameId = 'v_dice',
): Promise<string> =>
  sessionTokenService.createToken({
    playerId: 7,
    partnerId: 2,
    partnerCode,
    gameId,
    externalPlayerId: 'player-7',
  });

describe('AppGateway', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as PinoLogger;

  let sessionTokenService: SessionTokenService;
  let socketSessionGuard: SocketSessionGuard;
  let partnerWalletService: PartnerWalletService;
  let minesBetService: MinesBetService;
  let gateway: AppGateway;

  beforeAll(async () => {
    const partnerConfig = {
      getPartnerSecret: jest.fn().mockResolvedValue(partnerSecret),
    } as unknown as PartnerConfigService;

    const testingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        SessionTokenService,
        { provide: PartnerConfigService, useValue: partnerConfig },
      ],
    }).compile();

    sessionTokenService = testingModule.get(SessionTokenService);
    socketSessionGuard = {
      checkSession: jest.fn().mockResolvedValue('allowed'),
    } as unknown as SocketSessionGuard;
    partnerWalletService = {
      getBalance: jest.fn().mockResolvedValue(123.45),
    } as unknown as PartnerWalletService;
    minesBetService = {
      getActiveRound: jest.fn().mockResolvedValue(null),
    } as unknown as MinesBetService;
    gateway = new AppGateway(
      logger,
      sessionTokenService,
      socketSessionGuard,
      {} as FairnessService,
      {} as DiceBetService,
      {} as LimboBetService,
      minesBetService,
      {} as PlinkoBetService,
      {} as KenoBetService,
      {} as BetHistoryService,
      partnerWalletService,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(socketSessionGuard, 'checkSession').mockResolvedValue('allowed');
  });

  const createSocket = (token?: string, id = 'socket-1'): Socket => {
    const disconnect = jest.fn();
    const emit = jest.fn();

    return {
      id,
      handshake: {
        auth: token ? { token } : {},
      },
      data: {},
      disconnect,
      emit,
      removeAllListeners: jest.fn(),
    } as unknown as Socket;
  };

  it('rejects connections without a session token', async () => {
    const client = createSocket();

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('connection:error', {
      err_code: 'missing_session_token',
      message: 'Missing session token',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'missing_session_token',
        message: 'Missing session token',
        socketId: client.id,
      }),
      'Socket connection rejected',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(socketSessionGuard.checkSession).not.toHaveBeenCalled();
  });

  it('accepts connections with a valid session token', async () => {
    const client = createSocket(await createToken(sessionTokenService));

    await gateway.handleConnection(client);

    expect(socketSessionGuard.checkSession).toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('connection:status', {
      connected: true,
    });
    expect(gateway.handleSessionGet(client)).toEqual({
      playerId: 'player-7',
    });
    await expect(
      gateway.handleSessionGetBalance(client, { currency: 'USD' }),
    ).resolves.toEqual({
      balance: 123.45,
    });
    expect(partnerWalletService.getBalance).toHaveBeenCalledWith(
      partnerCode,
      2,
      'player-7',
      'USD',
    );
  });

  it('acknowledges a missing active Mines round with an object response', async () => {
    const client = createSocket(
      await createToken(sessionTokenService, MINES_GAME_ID),
    );
    await gateway.handleConnection(client);

    await expect(gateway.handleMinesGetActiveRound(client)).resolves.toEqual({
      round: null,
    });
    expect(minesBetService.getActiveRound).toHaveBeenCalled();
  });

  it('rejects connections with an invalid session token', async () => {
    const client = createSocket('not-a-token');

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('connection:error', {
      err_code: 'invalid_session_token',
      message: 'Invalid session token',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'invalid_session_token',
        message: 'Invalid session token',
        socketId: client.id,
      }),
      'Socket connection rejected',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(socketSessionGuard.checkSession).not.toHaveBeenCalled();
  });

  it('attaches session before async session check completes', async () => {
    let resolveCheck!: (result: 'allowed' | 'denied') => void;
    const checkPromise = new Promise<'allowed' | 'denied'>((resolve) => {
      resolveCheck = resolve;
    });
    jest
      .spyOn(socketSessionGuard, 'checkSession')
      .mockReturnValue(checkPromise);

    const client = createSocket(await createToken(sessionTokenService));
    const connectionPromise = gateway.handleConnection(client);

    while (!readSocketSession(client)) {
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    }

    expect(gateway.handleSessionGet(client)).toEqual({
      playerId: 'player-7',
    });

    resolveCheck('allowed');
    await connectionPromise;

    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects connections when the session is not allowed', async () => {
    const client = createSocket(await createToken(sessionTokenService));
    jest.spyOn(socketSessionGuard, 'checkSession').mockResolvedValue('denied');

    await gateway.handleConnection(client);

    expect(socketSessionGuard.checkSession).toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('connection:error', {
      err_code: 'session_denied',
      message: 'Session denied',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'session_denied',
        message: 'Session denied',
        socketId: client.id,
        jti: expect.any(String),
        partnerId: 2,
        partnerCode,
        gameId: 'v_dice',
      }),
      'Socket connection rejected',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).not.toHaveBeenCalledWith('connection:status', {
      connected: true,
    });
  });

  it('rejects connections with game_not_available when the game is inactive', async () => {
    const client = createSocket(await createToken(sessionTokenService));
    jest
      .spyOn(socketSessionGuard, 'checkSession')
      .mockResolvedValue('game_not_available');

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('connection:error', {
      err_code: 'game_not_available',
      message: 'Game not available',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err_code: 'game_not_available',
        message: 'Game not available',
        socketId: client.id,
        jti: expect.any(String),
        partnerId: 2,
        partnerCode,
        gameId: 'v_dice',
      }),
      'Socket connection rejected',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).not.toHaveBeenCalledWith('connection:status', {
      connected: true,
    });
  });

  it('disconnects without releasing a launch session', async () => {
    const client = createSocket(await createToken(sessionTokenService));

    await gateway.handleConnection(client);
    gateway.handleDisconnect(client);

    expect(client.removeAllListeners).toHaveBeenCalled();
  });
});
