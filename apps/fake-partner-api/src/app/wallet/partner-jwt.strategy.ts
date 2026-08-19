import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveGamesApiConfig } from '../games/resolve-games-api-config';
import type {
  AuthenticatedPartner,
  PartnerJwtPayload,
} from './partner-jwt-payload';

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(
  Strategy,
  'partner-jwt',
) {
  constructor() {
    const { partnerSecret } = resolveGamesApiConfig();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: partnerSecret,
    });
  }

  validate(payload: PartnerJwtPayload): AuthenticatedPartner {
    const { partnerCode } = resolveGamesApiConfig();

    if (payload.sub !== partnerCode) {
      throw new UnauthorizedException({
        err_code: 'unauthorized',
        message: 'Unauthorized',
      });
    }

    return {
      partnerCode: payload.sub,
    };
  }
}
