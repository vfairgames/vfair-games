import {
  BeforeApplicationShutdown,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type {
  ActiveRoundsState,
  DiceBetResult,
  FairnessState,
  GetBetHistoryResponse,
  GameId,
  KenoBetResult,
  LimboBetResult,
  MinesBetResult,
  MinesGetActiveRoundResponse,
  NextSeedPair,
  PlinkoBetResult,
} from '@vfair/game-contracts';
import {
  WS_DICE_PLACE_BET,
  WS_KENO_PLACE_BET,
  WS_LIMBO_PLACE_BET,
  WS_MINES_CASH_OUT,
  WS_MINES_GET_ACTIVE_ROUND,
  WS_MINES_PLACE_AUTO_ROUND,
  WS_MINES_PLACE_BET,
  WS_MINES_REVEAL_TILE,
  WS_PLINKO_PLACE_BET,
  WS_SESSION_GET_ACTIVE_ROUNDS,
  WS_SESSION_GET_BALANCE,
  WS_SESSION_GET_BET_HISTORY,
  WS_SESSION_GET_FAIRNESS,
  WS_SESSION_GET_NEXT_SEED_PAIR,
  WS_SESSION_ROTATE_FAIRNESS,
} from '@vfair/game-contracts';
import {
  DICE_GAME_ID,
  KENO_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
} from '@vfair/game-contracts';
import {
  InjectPinoLogger,
  logWsException,
  PinoLogger,
  resolveAllowedCorsOrigin,
} from '@vfair/nest-utils';
import { Server, Socket } from 'socket.io';
import '../env';
import { BetHistoryService } from './bet/bet-history.service';
import { DicePlaceBetDto } from './bet/dto/dice-place-bet.dto';
import { LimboPlaceBetDto } from './bet/dto/limbo-place-bet.dto';
import {
  MinesPlaceAutoRoundDto,
  MinesPlaceBetDto,
  MinesRevealTileDto,
} from './bet/dto/mines-place-bet.dto';
import { KenoPlaceBetDto } from './bet/dto/keno-place-bet.dto';
import { PlinkoPlaceBetDto } from './bet/dto/plinko-place-bet.dto';
import { GetBetHistoryDto } from './bet/dto/get-bet-history.dto';
import { DiceBetService } from './bet/dice-bet.service';
import { LimboBetService } from './bet/limbo-bet.service';
import { MinesBetService } from './bet/mines-bet.service';
import { KenoBetService } from './bet/keno-bet.service';
import { PlinkoBetService } from './bet/plinko-bet.service';
import { RotateFairnessDto } from './fairness/dto/rotate-fairness.dto';
import { FairnessService } from './fairness/fairness.service';
import { PartnerWalletService } from './partner-wallet/partner-wallet.service';
import { SessionTokenService } from './session/session-token.service';
import {
  attachSocketSession,
  assertSessionGameId,
  requireSocketSession,
} from './session/socket-session';
import { GetBalanceDto } from './session/dto/get-balance.dto';
import { mapHttpExceptionToWs } from './session/map-http-exception-to-ws';
import { SocketSessionGuard } from './session/socket-session.guard';
import { WsAcknowledgmentFilter } from './session/ws-acknowledgment.filter';
import { createWsValidationPipe } from './session/ws-validation.pipe';

type SessionGetResponse = {
  playerId: string;
};

type SessionGetBalanceResponse = {
  balance: number;
};

type ConnectionErrorPayload = {
  err_code: string;
  message: string;
};

const readSessionToken = (client: Socket): string | null => {
  const token = client.handshake.auth?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
};

@WebSocketGateway({
  namespace: '/',
  path: '/ws',
  cors: {
    origin: resolveAllowedCorsOrigin,
    credentials: true,
  },
})
@UseGuards(SocketSessionGuard)
@UseFilters(WsAcknowledgmentFilter)
export class AppGateway
  implements OnGatewayConnection, OnGatewayDisconnect, BeforeApplicationShutdown
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectPinoLogger(AppGateway.name)
    private readonly logger: PinoLogger,
    private readonly sessionTokenService: SessionTokenService,
    private readonly socketSessionGuard: SocketSessionGuard,
    private readonly fairnessService: FairnessService,
    private readonly diceBetService: DiceBetService,
    private readonly limboBetService: LimboBetService,
    private readonly minesBetService: MinesBetService,
    private readonly plinkoBetService: PlinkoBetService,
    private readonly kenoBetService: KenoBetService,
    private readonly betHistoryService: BetHistoryService,
    private readonly partnerWalletService: PartnerWalletService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = readSessionToken(client);

    if (!token) {
      this.rejectConnection(client, {
        err_code: 'missing_session_token',
        message: 'Missing session token',
      });
      return;
    }

    const session = await this.sessionTokenService.verifyForSocket(token);

    if (!session) {
      this.rejectConnection(client, {
        err_code: 'invalid_session_token',
        message: 'Invalid session token',
      });
      return;
    }

    attachSocketSession(client, session);

    const sessionCheck = await this.socketSessionGuard.checkSession(session);

    if (sessionCheck !== 'allowed') {
      const logContext = {
        jti: session.jti,
        partnerId: session.partnerId,
        partnerCode: session.partnerCode,
        gameId: session.gameId,
      };

      if (sessionCheck === 'game_not_available') {
        this.rejectConnection(
          client,
          {
            err_code: 'game_not_available',
            message: 'Game not available',
          },
          logContext,
        );
      } else {
        this.rejectConnection(
          client,
          {
            err_code: 'session_denied',
            message: 'Session denied',
          },
          logContext,
        );
      }

      return;
    }

    this.logger.info(
      { socketId: client.id, playerId: session.sub, jti: session.jti },
      'Socket connected',
    );
    client.emit('connection:status', { connected: true });
  }

  private rejectConnection(
    client: Socket,
    payload: ConnectionErrorPayload,
    context?: Record<string, unknown>,
  ): void {
    logWsException(
      this.logger,
      payload,
      { socketId: client.id, ...context },
      'Socket connection rejected',
    );

    client.emit('connection:error', payload);
    client.disconnect(true);
  }

  @SubscribeMessage('session:get')
  handleSessionGet(@ConnectedSocket() client: Socket): SessionGetResponse {
    const session = requireSocketSession(client);

    return {
      playerId: session.externalPlayerId,
    };
  }

  @SubscribeMessage(WS_SESSION_GET_BALANCE)
  @UsePipes(createWsValidationPipe('invalid_currency', 'Currency is required'))
  async handleSessionGetBalance(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GetBalanceDto,
  ): Promise<SessionGetBalanceResponse> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, session.gameId);

    try {
      const balance = await this.partnerWalletService.getBalance(
        session.partnerCode,
        session.partnerId,
        session.externalPlayerId,
        body.currency,
      );

      return { balance };
    } catch (error: unknown) {
      const wsError = mapHttpExceptionToWs(error);

      if (wsError) {
        throw wsError;
      }

      this.logger.error(
        { error, playerId: session.externalPlayerId, currency: body.currency },
        'Partner balance request failed',
      );

      throw new WsException({
        err_code: 'balance_unavailable',
        message: 'Balance is unavailable',
      });
    }
  }

  @SubscribeMessage(WS_SESSION_GET_FAIRNESS)
  async handleSessionGetFairness(
    @ConnectedSocket() client: Socket,
  ): Promise<FairnessState> {
    const session = requireSocketSession(client);

    return this.fairnessService.getFairnessState(Number(session.sub));
  }

  @SubscribeMessage(WS_SESSION_GET_NEXT_SEED_PAIR)
  async handleSessionGetNextSeedPair(
    @ConnectedSocket() client: Socket,
  ): Promise<NextSeedPair> {
    const session = requireSocketSession(client);

    return this.fairnessService.getNextSeedPair(Number(session.sub));
  }

  @SubscribeMessage(WS_SESSION_GET_ACTIVE_ROUNDS)
  async handleSessionGetActiveRounds(
    @ConnectedSocket() client: Socket,
  ): Promise<ActiveRoundsState> {
    const session = requireSocketSession(client);

    return this.fairnessService.getActiveRounds(Number(session.sub));
  }

  @SubscribeMessage(WS_SESSION_ROTATE_FAIRNESS)
  @UsePipes(
    createWsValidationPipe('invalid_client_seed', 'Client seed is required'),
  )
  async handleSessionRotateFairness(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RotateFairnessDto,
  ): Promise<FairnessState> {
    const session = requireSocketSession(client);

    return this.fairnessService.rotateFairness(Number(session.sub), body);
  }

  @SubscribeMessage(WS_SESSION_GET_BET_HISTORY)
  @UsePipes(
    createWsValidationPipe(
      'invalid_bet_history',
      'Bet history request is invalid',
    ),
  )
  async handleSessionGetBetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GetBetHistoryDto,
  ): Promise<GetBetHistoryResponse> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, body.gameId ?? session.gameId);

    return this.betHistoryService.getBetHistory(session, {
      ...body,
      gameId: session.gameId as GameId,
    });
  }

  @SubscribeMessage(WS_DICE_PLACE_BET)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleDicePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: DicePlaceBetDto,
  ): Promise<DiceBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, DICE_GAME_ID);

    return this.diceBetService.placeBet(session, body);
  }

  @SubscribeMessage(WS_LIMBO_PLACE_BET)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleLimboPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: LimboPlaceBetDto,
  ): Promise<LimboBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, LIMBO_GAME_ID);

    return this.limboBetService.placeBet(session, body);
  }

  @SubscribeMessage(WS_PLINKO_PLACE_BET)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handlePlinkoPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: PlinkoPlaceBetDto,
  ): Promise<PlinkoBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, PLINKO_GAME_ID);

    return this.plinkoBetService.placeBet(session, body);
  }

  @SubscribeMessage(WS_KENO_PLACE_BET)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleKenoPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: KenoPlaceBetDto,
  ): Promise<KenoBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, KENO_GAME_ID);

    return this.kenoBetService.placeBet(session, body);
  }

  @SubscribeMessage(WS_MINES_PLACE_BET)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleMinesPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: MinesPlaceBetDto,
  ): Promise<MinesBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, MINES_GAME_ID);

    return this.minesBetService.placeBet(session, body);
  }

  @SubscribeMessage(WS_MINES_REVEAL_TILE)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleMinesRevealTile(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: MinesRevealTileDto,
  ): Promise<MinesBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, MINES_GAME_ID);

    return this.minesBetService.revealTile(session, body);
  }

  @SubscribeMessage(WS_MINES_CASH_OUT)
  async handleMinesCashOut(
    @ConnectedSocket() client: Socket,
  ): Promise<MinesBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, MINES_GAME_ID);

    return this.minesBetService.cashOut(session);
  }

  @SubscribeMessage(WS_MINES_PLACE_AUTO_ROUND)
  @UsePipes(createWsValidationPipe('invalid_bet', 'Bet request is invalid'))
  async handleMinesPlaceAutoRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: MinesPlaceAutoRoundDto,
  ): Promise<MinesBetResult> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, MINES_GAME_ID);

    return this.minesBetService.placeAutoRound(session, body);
  }

  @SubscribeMessage(WS_MINES_GET_ACTIVE_ROUND)
  async handleMinesGetActiveRound(
    @ConnectedSocket() client: Socket,
  ): Promise<MinesGetActiveRoundResponse> {
    const session = requireSocketSession(client);
    assertSessionGameId(session, MINES_GAME_ID);

    return { round: await this.minesBetService.getActiveRound(session) };
  }

  handleDisconnect(client: Socket): void {
    this.logger.info({ socketId: client.id }, 'Socket disconnected');
    client.removeAllListeners();
  }

  beforeApplicationShutdown(signal?: string): void {
    this.logger.info({ signal }, 'Closing Socket.IO server');
    this.server?.disconnectSockets(true);
  }
}
