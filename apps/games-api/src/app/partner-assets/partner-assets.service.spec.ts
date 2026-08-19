import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { PartnerAssetsService } from './partner-assets.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('PartnerAssetsService', () => {
  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
  };

  const service = new PartnerAssetsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getThemeCss', () => {
    it('builds CSS from the stored palette', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        theme: {
          lightAccent: '#3D63DD',
          lightGray: '#8B8D98',
          lightBg: '#FFFFFF',
          darkAccent: '#3D63DD',
          darkGray: '#8B8D98',
          darkBg: '#111111',
        },
      });

      const css = await service.getThemeCss('acme');

      expect(css).toContain('--accent-9');
      expect(prisma.partner.findFirst).toHaveBeenCalledWith({
        where: { code: 'acme', deletedAt: null },
        select: {
          theme: {
            select: {
              lightAccent: true,
              lightGray: true,
              lightBg: true,
              darkAccent: true,
              darkGray: true,
              darkBg: true,
            },
          },
        },
      });
    });

    it('throws when the partner is missing', async () => {
      prisma.partner.findFirst.mockResolvedValue(null);

      await expect(service.getThemeCss('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getLogo', () => {
    it('returns stored bytes and content type', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        theme: {
          logoBytes: Buffer.from('png'),
          logoContentType: 'image/png',
        },
      });

      const logo = await service.getLogo('acme');

      expect(logo).toEqual({
        bytes: Buffer.from('png'),
        contentType: 'image/png',
      });
    });

    it('throws when no logo is stored', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        theme: {
          logoBytes: null,
          logoContentType: null,
        },
      });

      await expect(service.getLogo('acme')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
