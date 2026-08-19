import { BadRequestException, Injectable } from '@nestjs/common';
import { buildLaunchUrl, buildPartnerLaunchSettings } from '@vfair/app-common';
import { getAvailableGame } from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { RoundStatus } from '@vfair/prisma-client';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import { resolveLaunchContextFromConfig } from '../partner-config/partner-config-validation';
import { PrismaService } from '../prisma/prisma.service';
import { FairnessService } from '../fairness/fairness.service';
import { SessionTokenService } from '../session/session-token.service';
import type { LaunchDto } from './dto/launch.dto';
import { resolveGameBaseUrl } from './resolve-game-base-url';

export type LaunchResult = {
  url: string;
};

type ResolvedLaunchContext = ReturnType<typeof resolveLaunchContextFromConfig>;

@Injectable()
export class LaunchService {
  constructor(
    @InjectPinoLogger(LaunchService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly sessionTokenService: SessionTokenService,
    private readonly partnerConfig: PartnerConfigService,
    private readonly fairnessService: FairnessService,
  ) {}

  async launch(
    partner: AuthenticatedPartner,
    dto: LaunchDto,
  ): Promise<LaunchResult> {
    const context = await this.resolveLaunchContext(partner, dto);

    if (dto.mode === 'demo') {
      return this.createLaunchUrl(partner, dto, context);
    }

    const player = await this.prisma.player.upsert({
      where: {
        partnerId_externalId: {
          partnerId: partner.partnerId,
          externalId: dto.playerId,
        },
      },
      create: {
        partnerId: partner.partnerId,
        externalId: dto.playerId,
      },
      update: {},
      select: { id: true },
    });

    await this.assertActiveRoundCurrency(player.id, dto.gameId, dto.currency);

    const sessionToken = await this.sessionTokenService.createToken({
      playerId: player.id,
      partnerId: partner.partnerId,
      partnerCode: partner.partnerCode,
      gameId: dto.gameId,
      externalPlayerId: dto.playerId,
    });

    await this.fairnessService.ensureBootstrap(player.id);

    return this.createLaunchUrl(partner, dto, context, sessionToken, player.id);
  }

  private async assertActiveRoundCurrency(
    playerId: number,
    gameId: string,
    currency: string,
  ): Promise<void> {
    const activeRound = await this.prisma.gameRound.findFirst({
      where: {
        playerId,
        gameId,
        status: RoundStatus.ACTIVE,
      },
      select: { currency: true },
    });

    if (activeRound && activeRound.currency !== currency) {
      throw new BadRequestException({
        err_code: 'active_round_currency_mismatch',
        message: `Cannot launch with currency "${currency}" while an active round exists in "${activeRound.currency}"`,
      });
    }
  }

  private async resolveLaunchContext(
    partner: AuthenticatedPartner,
    dto: LaunchDto,
  ): Promise<ResolvedLaunchContext> {
    if (dto.partnerCode !== partner.partnerCode) {
      throw new BadRequestException({
        err_code: 'partner_code_mismatch',
        message: `partnerCode "${dto.partnerCode}" does not match authenticated partner "${partner.partnerCode}"`,
      });
    }

    const game = getAvailableGame(dto.gameId);
    if (!game) {
      throw new BadRequestException({
        err_code: 'unknown_game',
        message: `Unknown game "${dto.gameId}"`,
      });
    }

    const config = await this.partnerConfig.getByPartnerCode(
      partner.partnerCode,
      partner.partnerId,
    );

    return resolveLaunchContextFromConfig(config, dto.gameId, dto.currency);
  }

  private createLaunchUrl(
    partner: AuthenticatedPartner,
    dto: LaunchDto,
    context: ResolvedLaunchContext,
    sessionToken?: string,
    playerId?: number,
  ): LaunchResult {
    const settings = buildPartnerLaunchSettings({
      theme: {
        ...context.theme,
        ...(dto.appearance ? { defaultAppearance: dto.appearance } : {}),
      },
      currency: context.partnerCurrency,
      rtp: context.rtp,
      lobbyUrl: context.lobbyUrl,
      lang: dto.lang,
      ...(sessionToken ? { token: sessionToken } : {}),
    });

    const url = buildLaunchUrl(resolveGameBaseUrl(dto.gameId), settings);

    this.logger.info(
      {
        partnerId: partner.partnerId,
        gameId: dto.gameId,
        playerId,
        currency: dto.currency,
        demo: dto.mode === 'demo',
      },
      'Game launch URL created',
    );

    return { url };
  }
}
