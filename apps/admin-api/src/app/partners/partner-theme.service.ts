import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildPartnerPublicAssetUrls,
  resolvePartnerAssetsBaseUrl,
} from '@vfair/app-common';
import {
  defaultPartnerThemeConfig,
  parsePartnerColor,
  resolvePartnerAccentColors,
  type PartnerPalette,
  type PartnerThemeConfig,
} from '@vfair/radix-palette';
import { PrismaService } from '../prisma/prisma.service';
import type { PartnerThemeDto } from './dto/partner-theme.dto';
import {
  MAX_PARTNER_LOGO_BYTES,
  MAX_PARTNER_LOGO_SIZE_MESSAGE,
} from './partner-logo-upload.constants';
import type { PartnerLogoUploadFile } from './partner-logo-upload.types';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';

const LOGO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const PARTNER_THEME_SELECT = {
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
} as const;

const PALETTE_FIELDS = [
  'lightAccent',
  'lightGray',
  'lightBg',
  'darkAccent',
  'darkGray',
  'darkBg',
] as const satisfies readonly (keyof PartnerPalette)[];

const PARTNER_THEME_DEFAULTS: Omit<PartnerThemeConfig, 'theme' | 'logo'> = {
  lightAccent: defaultPartnerThemeConfig.lightAccent,
  lightGray: defaultPartnerThemeConfig.lightGray,
  lightBg: defaultPartnerThemeConfig.lightBg,
  darkAccent: defaultPartnerThemeConfig.darkAccent,
  darkGray: defaultPartnerThemeConfig.darkGray,
  darkBg: defaultPartnerThemeConfig.darkBg,
  defaultAppearance: defaultPartnerThemeConfig.defaultAppearance,
  themeSwitcherEnabled: defaultPartnerThemeConfig.themeSwitcherEnabled,
  lightAccentColor: defaultPartnerThemeConfig.lightAccentColor,
  darkAccentColor: defaultPartnerThemeConfig.darkAccentColor,
};

type PartnerThemeRow = {
  lightAccent: string;
  lightGray: string;
  lightBg: string;
  darkAccent: string;
  darkGray: string;
  darkBg: string;
  defaultAppearance: PartnerThemeConfig['defaultAppearance'];
  themeSwitcherEnabled: boolean;
  lightAccentColor: string;
  darkAccentColor: string;
  logoContentType: string | null;
  updatedAt: Date;
};

const toThemeConfig = (
  partnerCode: string,
  row: PartnerThemeRow,
): PartnerThemeConfig => {
  const assets = buildPartnerPublicAssetUrls({
    partnerCode,
    updatedAt: row.updatedAt,
    hasLogo: row.logoContentType !== null,
    baseUrl: resolvePartnerAssetsBaseUrl(process.env),
  });

  return {
    lightAccent: row.lightAccent,
    lightGray: row.lightGray,
    lightBg: row.lightBg,
    darkAccent: row.darkAccent,
    darkGray: row.darkGray,
    darkBg: row.darkBg,
    defaultAppearance: row.defaultAppearance,
    themeSwitcherEnabled: row.themeSwitcherEnabled,
    lightAccentColor: row.lightAccentColor,
    darkAccentColor: row.darkAccentColor,
    theme: assets.theme,
    logo: assets.logo,
  };
};

@Injectable()
export class PartnerThemeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerConfigCacheInvalidation: PartnerConfigCacheInvalidationService,
  ) {}

  async findOne(partnerId: number): Promise<PartnerThemeConfig> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, deletedAt: null },
      select: {
        code: true,
        theme: { select: PARTNER_THEME_SELECT },
      },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    if (!partner.theme) {
      return defaultPartnerThemeConfig;
    }

    return toThemeConfig(partner.code, partner.theme);
  }

  async uploadLogo(
    partnerId: number,
    file: PartnerLogoUploadFile | undefined,
  ): Promise<{ logo: string }> {
    if (!file) {
      throw new BadRequestException({
        err_code: 'logo_file_required',
        message: 'Logo file is required',
      });
    }

    if (!LOGO_EXTENSION_BY_MIME[file.mimetype]) {
      throw new BadRequestException({
        err_code: 'invalid_logo_format',
        message: 'Logo must be a PNG, JPEG, WebP, or SVG image',
      });
    }

    if (file.size > MAX_PARTNER_LOGO_BYTES) {
      throw new BadRequestException({
        err_code: 'logo_too_large',
        message: MAX_PARTNER_LOGO_SIZE_MESSAGE,
      });
    }

    const { code } = await this.loadPartner(partnerId);
    const logoBytes = new Uint8Array(file.buffer);
    const saved = await this.prisma.partnerTheme.upsert({
      where: { partnerId },
      create: {
        partnerId,
        ...PARTNER_THEME_DEFAULTS,
        logoBytes,
        logoContentType: file.mimetype,
      },
      update: {
        logoBytes,
        logoContentType: file.mimetype,
      },
      select: PARTNER_THEME_SELECT,
    });

    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
    const { logo } = toThemeConfig(code, saved);
    if (!logo) {
      throw new BadRequestException({
        err_code: 'logo_file_required',
        message: 'Logo file is required',
      });
    }

    return { logo };
  }

  async removeLogo(partnerId: number): Promise<void> {
    const { hasLogo } = await this.loadPartner(partnerId);

    if (!hasLogo) {
      return;
    }

    await this.prisma.partnerTheme.updateMany({
      where: { partnerId },
      data: { logoBytes: null, logoContentType: null },
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
  }

  async upsert(
    partnerId: number,
    dto: PartnerThemeDto,
  ): Promise<PartnerThemeConfig> {
    const { code } = await this.loadPartner(partnerId);
    const normalizedTheme = this.normalizeTheme(dto);
    const savedTheme = await this.prisma.partnerTheme.upsert({
      where: { partnerId },
      create: {
        partnerId,
        ...normalizedTheme,
      },
      update: normalizedTheme,
      select: PARTNER_THEME_SELECT,
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
    return toThemeConfig(code, savedTheme);
  }

  private normalizeTheme(
    dto: PartnerThemeDto,
  ): Omit<PartnerThemeConfig, 'theme' | 'logo'> {
    const palette = {} as PartnerPalette;

    for (const field of PALETTE_FIELDS) {
      const parsed = parsePartnerColor(dto[field]);
      if (!parsed) {
        throw new BadRequestException({
          err_code: 'invalid_theme_field',
          message: `Invalid ${field}`,
        });
      }
      palette[field] = parsed;
    }

    return {
      ...palette,
      ...resolvePartnerAccentColors(palette),
      defaultAppearance: dto.defaultAppearance,
      themeSwitcherEnabled: dto.themeSwitcherEnabled,
    };
  }

  private async loadPartner(partnerId: number): Promise<{
    code: string;
    hasLogo: boolean;
  }> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, deletedAt: null },
      select: {
        code: true,
        theme: {
          select: {
            logoContentType: true,
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

    return {
      code: partner.code,
      hasLogo: partner.theme?.logoContentType != null,
    };
  }
}
