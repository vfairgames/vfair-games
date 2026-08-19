import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CountryCode, Currency } from '@vfair/app-common';
import {
  buildPartnerPublicAssetUrls,
  getCountryByCurrency,
  resolvePartnerAssetsBaseUrl,
} from '@vfair/app-common';
import { defaultPartnerThemeConfig } from '@vfair/radix-palette';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  PARTNER_CONFIG_CACHE_TTL_SECONDS,
  partnerConfigCacheKey,
  type PartnerCurrencyRuntimeConfig,
  type PartnerRuntimeConfig,
} from './partner-config-validation';

@Injectable()
export class PartnerConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectPinoLogger(PartnerConfigService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getByPartnerCode(
    partnerCode: string,
    expectedPartnerId?: number,
  ): Promise<PartnerRuntimeConfig> {
    const config = await this.resolveCachedConfig(partnerCode);

    if (
      expectedPartnerId === undefined ||
      config.partnerId === expectedPartnerId
    ) {
      return config;
    }

    this.logger.warn(
      {
        partnerCode,
        expectedPartnerId,
        cachedPartnerId: config.partnerId,
      },
      'Partner config cache partnerId mismatch; invalidating and reloading',
    );
    await this.invalidateCache(partnerCode);
    const reloaded = await this.resolveCachedConfig(partnerCode);

    if (reloaded.partnerId !== expectedPartnerId) {
      throw new BadRequestException({
        err_code: 'partner_config_mismatch',
        message: `Partner configuration mismatch for partner code "${partnerCode}"`,
      });
    }

    return reloaded;
  }

  async invalidateCache(partnerCode: string): Promise<void> {
    await this.deleteCacheKey(partnerConfigCacheKey(partnerCode), partnerCode);
  }

  async getPartnerSecret(partnerCode: string): Promise<string> {
    const partner = await this.prisma.partner.findFirst({
      where: { code: partnerCode, deletedAt: null },
      select: { secret: true },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    return partner.secret;
  }

  private async resolveCachedConfig(
    partnerCode: string,
  ): Promise<PartnerRuntimeConfig> {
    const key = partnerConfigCacheKey(partnerCode);

    try {
      const cached = await this.redisService.client.get(key);

      if (cached) {
        try {
          return JSON.parse(cached) as PartnerRuntimeConfig;
        } catch (error: unknown) {
          this.logger.warn(
            { error, partnerCode, key },
            'Failed to parse partner config cache entry',
          );
          await this.deleteCacheKey(key, partnerCode);
        }
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, partnerCode },
        'Failed to read partner config from cache; loading from database',
      );
    }

    const config = await this.loadFromDatabase(partnerCode);

    try {
      await this.redisService.client.set(
        key,
        JSON.stringify(config),
        'EX',
        PARTNER_CONFIG_CACHE_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.warn(
        { error, partnerCode },
        'Failed to write partner config to cache',
      );
    }

    return config;
  }

  private async loadFromDatabase(
    partnerCode: string,
  ): Promise<PartnerRuntimeConfig> {
    const partner = await this.prisma.partner.findFirst({
      where: { code: partnerCode, deletedAt: null },
      select: {
        id: true,
        code: true,
        lobbyUrl: true,
        webhookUrl: true,
        theme: {
          select: {
            lightAccent: true,
            lightGray: true,
            lightBg: true,
            darkAccent: true,
            darkGray: true,
            darkBg: true,
            defaultAppearance: true,
            themeSwitcherEnabled: true,
            lightAccentColor: true,
            darkAccentColor: true,
            logoContentType: true,
            updatedAt: true,
          },
        },
        currencies: {
          select: {
            code: true,
            minBet: true,
            maxBet: true,
            maxWin: true,
            decimals: true,
          },
        },
        games: {
          select: {
            gameId: true,
            enabled: true,
            rtp: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    const theme = partner.theme;
    const defaults = defaultPartnerThemeConfig;
    const assets = theme
      ? buildPartnerPublicAssetUrls({
          partnerCode: partner.code,
          updatedAt: theme.updatedAt,
          hasLogo: theme.logoContentType !== null,
          baseUrl: resolvePartnerAssetsBaseUrl(process.env),
        })
      : { theme: null, logo: null };

    return {
      partnerId: partner.id,
      partnerCode: partner.code,
      lobbyUrl: partner.lobbyUrl,
      webhookUrl: partner.webhookUrl,
      lightAccentColor: theme?.lightAccentColor ?? defaults.lightAccentColor,
      darkAccentColor: theme?.darkAccentColor ?? defaults.darkAccentColor,
      defaultAppearance: theme?.defaultAppearance ?? defaults.defaultAppearance,
      themeSwitcherEnabled:
        theme?.themeSwitcherEnabled ?? defaults.themeSwitcherEnabled,
      theme: assets.theme,
      logo: assets.logo,
      palette: {
        lightAccent: theme?.lightAccent ?? defaults.lightAccent,
        lightGray: theme?.lightGray ?? defaults.lightGray,
        lightBg: theme?.lightBg ?? defaults.lightBg,
        darkAccent: theme?.darkAccent ?? defaults.darkAccent,
        darkGray: theme?.darkGray ?? defaults.darkGray,
        darkBg: theme?.darkBg ?? defaults.darkBg,
      },
      currencyConfigs: Object.fromEntries(
        partner.currencies.map((currency) => [
          currency.code,
          this.buildPartnerCurrencyRuntimeConfig({
            code: currency.code,
            minBet: currency.minBet.toNumber(),
            maxBet: currency.maxBet.toNumber(),
            maxWin: currency.maxWin.toNumber(),
            decimals: currency.decimals,
          }),
        ]),
      ),
      gameConfigs: Object.fromEntries(
        partner.games.map((game) => [
          game.gameId,
          { enabled: game.enabled, rtp: game.rtp },
        ]),
      ),
    };
  }

  private buildPartnerCurrencyRuntimeConfig(input: {
    code: string;
    minBet: number;
    maxBet: number;
    maxWin: number;
    decimals: number;
  }): PartnerCurrencyRuntimeConfig {
    return {
      currency: input.code,
      minBet: input.minBet,
      maxBet: input.maxBet,
      maxWin: input.maxWin,
      currencyDecimals: input.decimals,
      countryCode: getCountryByCurrency(
        input.code as Currency,
      ).toUpperCase() as CountryCode,
    };
  }

  private async deleteCacheKey(
    key: string,
    partnerCode: string,
  ): Promise<void> {
    try {
      await this.redisService.client.del(key);
    } catch (error: unknown) {
      this.logger.warn(
        { error, partnerCode, key },
        'Failed to delete partner config cache entry',
      );
    }
  }
}
