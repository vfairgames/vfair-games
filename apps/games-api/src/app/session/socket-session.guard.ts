import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import { isGameActiveInConfig } from '../partner-config/partner-config-validation';
import { SessionTokenInvalidationService } from './session-token-invalidation.service';
import type { SessionTokenPayload } from './session-token.service';
import { readSocketSession } from './socket-session';

export type SessionCheckResult = 'allowed' | 'game_not_available' | 'denied';

@Injectable()
export class SocketSessionGuard implements CanActivate {
  constructor(
    private readonly sessionTokenInvalidationService: SessionTokenInvalidationService,
    private readonly partnerConfig: PartnerConfigService,
  ) {}

  async checkSession(
    session: SessionTokenPayload,
  ): Promise<SessionCheckResult> {
    if (!session.partnerCode) {
      return 'denied';
    }

    if (await this.sessionTokenInvalidationService.isInvalidated(session.jti)) {
      return 'denied';
    }

    try {
      const config = await this.partnerConfig.getByPartnerCode(
        session.partnerCode,
        session.partnerId,
      );

      return isGameActiveInConfig(config, session.gameId)
        ? 'allowed'
        : 'game_not_available';
    } catch {
      return 'denied';
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const session = readSocketSession(context.switchToWs().getClient<Socket>());

    if (!session) {
      throw new WsException({
        err_code: 'session_not_found',
        message: 'Session not found',
      });
    }

    const checkResult = await this.checkSession(session);

    if (checkResult === 'allowed') {
      return true;
    }

    if (checkResult === 'game_not_available') {
      throw new WsException({
        err_code: 'game_not_available',
        message: 'Game not available',
      });
    }

    throw new WsException({
      err_code: 'session_denied',
      message: 'Session denied',
    });
  }
}
