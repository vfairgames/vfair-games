import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildLaunchUrl,
  buildPartnerVerificationSettings,
  isLanguage,
} from '@vfair/app-common';
import { AVAILABLE_GAME_IDS, isAvailableGameId } from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { runtimeConfigToTheme } from '../partner-config/partner-config-validation';
import type { VerificationLaunchDto } from './dto/verification-launch.dto';
import { resolveVerificationToolBaseUrl } from './resolve-verification-base-url';

type VerificationLaunchResult = {
  url: string;
};

@Injectable()
export class VerificationService {
  constructor(
    @InjectPinoLogger(VerificationService.name)
    private readonly logger: PinoLogger,
    private readonly partnerConfig: PartnerConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async launch(
    partner: AuthenticatedPartner,
    dto: VerificationLaunchDto,
  ): Promise<VerificationLaunchResult> {
    if (dto.partnerCode !== partner.partnerCode) {
      throw new BadRequestException({
        err_code: 'partner_code_mismatch',
        message: `partnerCode "${dto.partnerCode}" does not match authenticated partner "${partner.partnerCode}"`,
      });
    }

    const config = await this.partnerConfig.getByPartnerCode(
      partner.partnerCode,
      partner.partnerId,
    );

    const games = AVAILABLE_GAME_IDS.filter(
      (gameId) => config.gameConfigs[gameId]?.enabled === true,
    ).map((gameId) => ({
      id: gameId,
      rtp: config.gameConfigs[gameId].rtp,
    }));

    const theme = runtimeConfigToTheme(config);
    const settings = buildPartnerVerificationSettings({
      partnerCode: partner.partnerCode,
      theme: {
        ...theme,
        ...(dto.appearance ? { defaultAppearance: dto.appearance } : {}),
      },
      games,
      lang: dto.lang,
    });

    const url = buildLaunchUrl(resolveVerificationToolBaseUrl(), settings);

    this.logger.info(
      {
        partnerId: partner.partnerId,
        gameCount: games.length,
      },
      'Verification tool launch URL created',
    );

    return { url };
  }

  async getHelpContent(
    gameId: string,
    partnerCode?: string,
    lang?: string,
  ): Promise<{ html: string }> {
    if (!isAvailableGameId(gameId)) {
      throw new NotFoundException({
        err_code: 'unknown_game',
        message: `Unknown game "${gameId}"`,
      });
    }

    const code = partnerCode?.trim();
    if (!code) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    const partner = await this.prisma.partner.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    const requested = lang?.trim().toLowerCase() ?? '';
    const preferredLang = requested && isLanguage(requested) ? requested : 'en';

    const preferred = await this.findHelpHtml(
      partner.id,
      gameId,
      preferredLang,
    );
    if (preferred) {
      return { html: preferred };
    }

    if (preferredLang !== 'en') {
      const english = await this.findHelpHtml(partner.id, gameId, 'en');
      if (english) {
        return { html: english };
      }
    }

    return { html: '' };
  }

  private async findHelpHtml(
    partnerId: number,
    gameId: string,
    lang: string,
  ): Promise<string | null> {
    const row = await this.prisma.gameVerificationContent.findUnique({
      where: {
        partnerId_gameId_lang: { partnerId, gameId, lang },
      },
      select: { html: true },
    });

    if (!row?.html.trim()) {
      return null;
    }

    return row.html;
  }
}
