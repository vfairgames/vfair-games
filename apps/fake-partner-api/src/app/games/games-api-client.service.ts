import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import ky, { type KyInstance } from 'ky';
import { resolveGamesApiConfig } from './resolve-games-api-config';

@Injectable()
export class GamesApiClient {
  readonly client: KyInstance;

  constructor(private readonly jwtService: JwtService) {
    const { gamesApiUrl, partnerCode, partnerSecret } = resolveGamesApiConfig();

    this.client = ky.create({
      prefix: gamesApiUrl,
      hooks: {
        beforeRequest: [
          ({ request }) => {
            const partnerToken = this.jwtService.sign(
              { sub: partnerCode },
              { secret: partnerSecret, expiresIn: '30s' },
            );
            request.headers.set('Authorization', `Bearer ${partnerToken}`);
          },
        ],
      },
    });
  }
}
