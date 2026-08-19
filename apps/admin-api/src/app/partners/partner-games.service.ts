import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isLanguage } from '@vfair/app-common';
import {
  AVAILABLE_GAMES,
  getAvailableGame,
  isAvailableGameId,
  KENO_GAME_ID,
  PLINKO_GAME_ID,
} from '@vfair/game-contracts';
import { DEFAULT_GAME_RTP, UNSUPPORTED_GAME_RTP } from '@vfair/game-math';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdatePartnerGameDto } from './dto/update-partner-game.dto';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';

type PartnerGameItem = {
  gameId: string;
  name: string;
  enabled: boolean;
};

type PartnerGameConfigItem = {
  gameId: string;
  name: string;
  enabled: boolean;
  rtp: number;
};

type HelpContentItem = {
  lang: string;
  html: string;
  updatedAt: string;
};

const defaultRtpForGame = (gameId: string): number => {
  if (gameId === PLINKO_GAME_ID || gameId === KENO_GAME_ID) {
    return UNSUPPORTED_GAME_RTP;
  }

  return DEFAULT_GAME_RTP;
};

const isFixedRtpGame = (gameId: string): boolean =>
  gameId === PLINKO_GAME_ID || gameId === KENO_GAME_ID;

@Injectable()
export class PartnerGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerConfigCacheInvalidation: PartnerConfigCacheInvalidationService,
  ) {}

  async findAll(partnerId: number): Promise<PartnerGameItem[]> {
    await this.assertPartnerExists(partnerId);

    const partnerGames = await this.prisma.partnerGame.findMany({
      where: { partnerId },
      select: { gameId: true, enabled: true },
    });

    const enabledByGameId = new Map(
      partnerGames.map((game) => [game.gameId, game.enabled]),
    );

    return AVAILABLE_GAMES.map((game) => ({
      gameId: game.id,
      name: game.name,
      enabled: enabledByGameId.get(game.id) ?? false,
    }));
  }

  async findOne(
    partnerId: number,
    gameId: string,
  ): Promise<PartnerGameConfigItem> {
    await this.assertPartnerExists(partnerId);

    const game = getAvailableGame(gameId);
    if (!game) {
      throw new BadRequestException({
        err_code: 'unknown_game',
        message: 'Unknown game',
      });
    }

    const partnerGame = await this.prisma.partnerGame.findUnique({
      where: {
        partnerId_gameId: {
          partnerId,
          gameId,
        },
      },
      select: { enabled: true, rtp: true },
    });

    return {
      gameId: game.id,
      name: game.name,
      enabled: partnerGame?.enabled ?? false,
      rtp: partnerGame?.rtp ?? defaultRtpForGame(gameId),
    };
  }

  async update(
    partnerId: number,
    gameId: string,
    dto: UpdatePartnerGameDto,
  ): Promise<PartnerGameConfigItem> {
    await this.assertPartnerExists(partnerId);

    const game = getAvailableGame(gameId);
    if (!game) {
      throw new BadRequestException({
        err_code: 'unknown_game',
        message: 'Unknown game',
      });
    }

    const hasEnabled = dto.enabled != null;
    const hasRtp = dto.rtp !== undefined;

    if (!hasEnabled && !hasRtp) {
      throw new BadRequestException({
        err_code: 'no_fields_provided',
        message: 'At least one field must be provided',
      });
    }

    if (isFixedRtpGame(gameId) && hasRtp) {
      throw new BadRequestException({
        err_code: 'rtp_not_supported',
        message: `RTP is not configurable for ${game.name}`,
      });
    }

    await this.prisma.partnerGame.upsert({
      where: {
        partnerId_gameId: {
          partnerId,
          gameId,
        },
      },
      create: {
        partnerId,
        gameId,
        enabled: dto.enabled ?? false,
        rtp: dto.rtp ?? defaultRtpForGame(gameId),
      },
      update: {
        ...(hasEnabled ? { enabled: dto.enabled } : {}),
        ...(hasRtp ? { rtp: dto.rtp ?? defaultRtpForGame(gameId) } : {}),
      },
    });

    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
    return this.findOne(partnerId, gameId);
  }

  async getHelpContent(
    partnerId: number,
    gameId: string,
  ): Promise<HelpContentItem[]> {
    await this.assertPartnerExists(partnerId);
    this.assertKnownGame(gameId);

    const rows = await this.prisma.gameVerificationContent.findMany({
      where: { partnerId, gameId },
      select: { lang: true, html: true, updatedAt: true },
      orderBy: { lang: 'asc' },
    });

    return rows.map((row) => ({
      lang: row.lang,
      html: row.html,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async upsertHelpContent(
    partnerId: number,
    gameId: string,
    lang: string,
    html: string,
  ): Promise<HelpContentItem> {
    await this.assertPartnerExists(partnerId);
    this.assertKnownGame(gameId);

    const normalizedLang = lang.trim().toLowerCase();
    if (!isLanguage(normalizedLang)) {
      throw new BadRequestException({
        err_code: 'invalid_language',
        message: `Language "${lang}" is not a valid ISO 639-1 code`,
      });
    }

    const row = await this.prisma.gameVerificationContent.upsert({
      where: {
        partnerId_gameId_lang: { partnerId, gameId, lang: normalizedLang },
      },
      create: {
        partnerId,
        gameId,
        lang: normalizedLang,
        html,
      },
      update: { html },
      select: { lang: true, html: true, updatedAt: true },
    });

    return {
      lang: row.lang,
      html: row.html,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private assertKnownGame(gameId: string): void {
    if (!isAvailableGameId(gameId)) {
      throw new NotFoundException({
        err_code: 'unknown_game',
        message: `Unknown game "${gameId}"`,
      });
    }
  }

  private async assertPartnerExists(partnerId: number): Promise<void> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, deletedAt: null },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
  }
}
