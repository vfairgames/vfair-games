import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthenticatedPartner,
  PartnerJwtPayload,
} from './partner-jwt-payload';

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(
  Strategy,
  'partner-jwt',
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (
        _request: unknown,
        rawJwtToken: string,
        done: (error: Error | null, secret?: string) => void,
      ) => {
        void this.resolvePartnerSecret(rawJwtToken, done);
      },
    });
  }

  private async resolvePartnerSecret(
    rawJwtToken: string,
    done: (error: Error | null, secret?: string) => void,
  ): Promise<void> {
    try {
      const decoded = this.jwtService.decode<PartnerJwtPayload>(rawJwtToken);
      if (
        !decoded ||
        typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        decoded.sub.length === 0
      ) {
        done(
          new UnauthorizedException({
            err_code: 'unauthorized',
            message: 'Unauthorized',
          }),
          undefined,
        );
        return;
      }

      const partner = await this.prisma.partner.findFirst({
        where: { code: decoded.sub, deletedAt: null },
        select: { secret: true },
      });

      if (!partner) {
        done(
          new UnauthorizedException({
            err_code: 'unauthorized',
            message: 'Unauthorized',
          }),
          undefined,
        );
        return;
      }

      done(null, partner.secret);
    } catch (error: unknown) {
      done(
        error instanceof Error
          ? error
          : new UnauthorizedException({
              err_code: 'unauthorized',
              message: 'Unauthorized',
            }),
        undefined,
      );
    }
  }

  async validate(payload: PartnerJwtPayload): Promise<AuthenticatedPartner> {
    const partner = await this.prisma.partner.findFirst({
      where: { code: payload.sub, deletedAt: null },
      select: { id: true, code: true, ipWhitelist: true },
    });

    if (!partner) {
      throw new UnauthorizedException({
        err_code: 'unauthorized',
        message: 'Unauthorized',
      });
    }

    return {
      partnerId: partner.id,
      partnerCode: partner.code,
      ipWhitelist: partner.ipWhitelist,
    };
  }
}
