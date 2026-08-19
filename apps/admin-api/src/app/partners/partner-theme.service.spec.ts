import { BadRequestException } from '@nestjs/common';
import {
  buildPartnerPublicAssetUrls,
  DEFAULT_PARTNER_ASSETS_BASE_URL,
} from '@vfair/app-common';
import { PartnerThemeService } from './partner-theme.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PartnerThemeDto } from './dto/partner-theme.dto';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const partnerConfigCacheInvalidation = {
  invalidateByPartnerId: jest.fn(),
};

const createService = (prisma: unknown): PartnerThemeService =>
  new PartnerThemeService(
    prisma as PrismaService,
    partnerConfigCacheInvalidation as never,
  );

const themeDto: PartnerThemeDto = {
  lightAccent: '#3D63DD',
  lightGray: '#8B8D98',
  lightBg: '#FFFFFF',
  darkAccent: '#3D63DD',
  darkGray: '#8B8D98',
  darkBg: '#111111',
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
};

const logoFile = {
  mimetype: 'image/png',
  size: 1024,
  buffer: Buffer.from('png'),
};

const updatedAt = new Date('2026-08-14T12:00:00.000Z');

const savedThemeRow = {
  ...themeDto,
  lightAccentColor: 'blue',
  darkAccentColor: 'blue',
  logoContentType: null as string | null,
  updatedAt,
};

describe('PartnerThemeService', () => {
  const partnerId = 1;
  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
    partnerTheme: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: PartnerThemeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
    prisma.partner.findFirst.mockResolvedValue({
      code: 'acme',
      theme: null,
    });
    prisma.partnerTheme.upsert.mockResolvedValue(savedThemeRow);
  });

  describe('upsert', () => {
    it('saves palette fields and returns a public theme CSS URL', async () => {
      const result = await service.upsert(partnerId, themeDto);

      expect(prisma.partnerTheme.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            partnerId,
            lightAccentColor: 'blue',
            darkAccentColor: 'blue',
          }),
          update: expect.objectContaining({
            lightAccentColor: 'blue',
            darkAccentColor: 'blue',
          }),
        }),
      );
      expect(result.theme).toBe(
        buildPartnerPublicAssetUrls({
          partnerCode: 'acme',
          updatedAt,
          hasLogo: false,
          baseUrl: DEFAULT_PARTNER_ASSETS_BASE_URL,
        }).theme,
      );
      expect(result.logo).toBeNull();
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });

    it('rejects an invalid palette color', async () => {
      await expect(
        service.upsert(partnerId, { ...themeDto, lightAccent: 'not-a-color' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.partnerTheme.upsert).not.toHaveBeenCalled();
    });
  });

  describe('uploadLogo', () => {
    it('stores logo bytes and returns a public logo URL', async () => {
      prisma.partnerTheme.upsert.mockResolvedValue({
        ...savedThemeRow,
        logoContentType: 'image/png',
      });

      const result = await service.uploadLogo(partnerId, logoFile);

      expect(prisma.partnerTheme.upsert).toHaveBeenCalledWith({
        where: { partnerId },
        create: expect.objectContaining({
          partnerId,
          logoBytes: expect.any(Uint8Array),
          logoContentType: 'image/png',
        }),
        update: {
          logoBytes: expect.any(Uint8Array),
          logoContentType: 'image/png',
        },
        select: expect.objectContaining({
          logoContentType: true,
          updatedAt: true,
        }),
      });
      expect(result).toEqual({
        logo: buildPartnerPublicAssetUrls({
          partnerCode: 'acme',
          updatedAt,
          hasLogo: true,
          baseUrl: DEFAULT_PARTNER_ASSETS_BASE_URL,
        }).logo,
      });
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });
  });

  describe('removeLogo', () => {
    it('clears stored logo bytes when a logo exists', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        code: 'acme',
        theme: { logoContentType: 'image/png' },
      });

      await service.removeLogo(partnerId);

      expect(prisma.partnerTheme.updateMany).toHaveBeenCalledWith({
        where: { partnerId },
        data: { logoBytes: null, logoContentType: null },
      });
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });

    it('does nothing when the partner has no logo', async () => {
      await service.removeLogo(partnerId);

      expect(prisma.partnerTheme.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns default theme URLs when the partner has no theme row', async () => {
      const result = await service.findOne(partnerId);

      expect(result.theme).toBeNull();
      expect(result.logo).toBeNull();
    });

    it('maps stored theme rows to public asset URLs', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        code: 'acme',
        theme: {
          ...savedThemeRow,
          logoContentType: 'image/png',
        },
      });

      const result = await service.findOne(partnerId);
      const expected = buildPartnerPublicAssetUrls({
        partnerCode: 'acme',
        updatedAt,
        hasLogo: true,
        baseUrl: DEFAULT_PARTNER_ASSETS_BASE_URL,
      });

      expect(result.theme).toBe(expected.theme);
      expect(result.logo).toBe(expected.logo);
      expect(result.theme.startsWith(DEFAULT_PARTNER_ASSETS_BASE_URL)).toBe(
        true,
      );
    });
  });
});
