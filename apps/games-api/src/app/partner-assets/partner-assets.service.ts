import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPartnerThemeCss } from '@vfair/radix-palette';
import { PrismaService } from '../prisma/prisma.service';

export type PartnerLogoAsset = {
  bytes: Buffer;
  contentType: string;
};

@Injectable()
export class PartnerAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getThemeCss(partnerCode: string): Promise<string> {
    const partner = await this.findPartner(partnerCode, {
      lightAccent: true,
      lightGray: true,
      lightBg: true,
      darkAccent: true,
      darkGray: true,
      darkBg: true,
    });

    if (!partner.theme) {
      throw this.themeNotFound();
    }

    return buildPartnerThemeCss(partner.theme);
  }

  async getLogo(partnerCode: string): Promise<PartnerLogoAsset> {
    const partner = await this.findPartner(partnerCode, {
      logoBytes: true,
      logoContentType: true,
    });

    if (!partner.theme?.logoBytes || !partner.theme.logoContentType) {
      throw new NotFoundException({
        err_code: 'partner_logo_not_found',
        message: 'Partner logo not found',
      });
    }

    return {
      bytes: Buffer.from(partner.theme.logoBytes),
      contentType: partner.theme.logoContentType,
    };
  }

  private async findPartner<TSelect extends Record<string, boolean>>(
    partnerCode: string,
    themeSelect: TSelect,
  ) {
    const partner = await this.prisma.partner.findFirst({
      where: { code: partnerCode, deletedAt: null },
      select: {
        theme: { select: themeSelect },
      },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    return partner;
  }

  private themeNotFound(): NotFoundException {
    return new NotFoundException({
      err_code: 'partner_theme_not_found',
      message: 'Partner theme not found',
    });
  }
}
