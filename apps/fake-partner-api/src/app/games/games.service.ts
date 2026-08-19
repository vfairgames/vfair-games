import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { getAvailableGame } from '@vfair/game-contracts';
import { AuthService } from '../auth/auth.service';
import type { LaunchGameDto } from './dto/launch-game.dto';
import type { LaunchVerificationDto } from './dto/launch-verification.dto';
import { GamesApiClient } from './games-api-client.service';
import { resolveGamesApiConfig } from './resolve-games-api-config';

export type LaunchGameResult = {
  url: string;
};

@Injectable()
export class GamesService {
  constructor(
    private readonly authService: AuthService,
    private readonly gamesApiClient: GamesApiClient,
  ) {}

  async launch(
    playerId: number,
    dto: LaunchGameDto,
  ): Promise<LaunchGameResult> {
    const game = getAvailableGame(dto.gameId);
    if (!game) {
      throw new BadRequestException({
        err_code: 'unknown_game',
        message: `Unknown game "${dto.gameId}"`,
      });
    }

    const profile = await this.authService.getProfile(playerId);
    const wallet = profile.wallets.find(
      (entry) => entry.currency === dto.currency,
    );

    if (!wallet) {
      throw new BadRequestException({
        err_code: 'currency_not_available',
        message: 'Currency not available for this player',
      });
    }

    const { partnerCode } = resolveGamesApiConfig();

    try {
      const body = await this.gamesApiClient.client
        .post('api/launch', {
          json: {
            partnerCode,
            gameId: dto.gameId,
            playerId: profile.username,
            currency: dto.currency,
            mode: dto.mode,
            ...(dto.lang ? { lang: dto.lang } : {}),
            ...(dto.appearance ? { appearance: dto.appearance } : {}),
          },
        })
        .json<{ url?: string }>();

      if (!body.url) {
        throw new BadGatewayException({
          err_code: 'invalid_launch_response',
          message: 'games-api returned an invalid launch response',
        });
      }

      return { url: body.url };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        err_code: 'launch_request_failed',
        message:
          error instanceof Error ? error.message : 'Launch request failed',
      });
    }
  }

  async launchVerification(
    dto: LaunchVerificationDto,
  ): Promise<LaunchGameResult> {
    const { partnerCode } = resolveGamesApiConfig();

    try {
      const body = await this.gamesApiClient.client
        .post('api/verification/launch', {
          json: {
            partnerCode,
            ...(dto.lang ? { lang: dto.lang } : {}),
            ...(dto.appearance ? { appearance: dto.appearance } : {}),
          },
        })
        .json<{ url?: string }>();

      if (!body.url) {
        throw new BadGatewayException({
          err_code: 'invalid_launch_response',
          message: 'games-api returned an invalid launch response',
        });
      }

      return { url: body.url };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        err_code: 'verification_launch_request_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Verification launch request failed',
      });
    }
  }
}
