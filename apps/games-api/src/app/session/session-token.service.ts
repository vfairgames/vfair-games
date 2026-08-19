import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PartnerConfigService } from '../partner-config/partner-config.service';

export type SessionTokenPayload = {
  sub: string;
  partnerId: number;
  partnerCode: string;
  gameId: string;
  externalPlayerId: string;
  jti: string;
};

@Injectable()
export class SessionTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly partnerConfig: PartnerConfigService,
  ) {}

  async createToken(input: {
    playerId: number;
    partnerId: number;
    partnerCode: string;
    gameId: string;
    externalPlayerId: string;
  }): Promise<string> {
    const secret = await this.partnerConfig.getPartnerSecret(input.partnerCode);
    const jti = randomUUID();
    const payload: SessionTokenPayload = {
      sub: String(input.playerId),
      partnerId: input.partnerId,
      partnerCode: input.partnerCode,
      gameId: input.gameId,
      externalPlayerId: input.externalPlayerId,
      jti,
    };

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: '12h',
    });
  }

  async verifyToken(token: string): Promise<SessionTokenPayload> {
    const partnerCode = this.readPartnerCodeFromToken(token);
    const secret = await this.partnerConfig.getPartnerSecret(partnerCode);

    return this.jwtService.verify<SessionTokenPayload>(token, {
      secret,
    });
  }

  async verifyForSocket(token: string): Promise<SessionTokenPayload | null> {
    try {
      return await this.verifyToken(token);
    } catch {
      return null;
    }
  }

  private readPartnerCodeFromToken(token: string): string {
    const decoded = this.jwtService.decode<SessionTokenPayload>(token);

    if (
      !decoded ||
      typeof decoded === 'string' ||
      typeof decoded.partnerCode !== 'string' ||
      decoded.partnerCode.length === 0
    ) {
      throw new Error('Invalid session token');
    }

    return decoded.partnerCode;
  }
}
