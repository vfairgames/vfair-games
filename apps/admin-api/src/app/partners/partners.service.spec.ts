jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from './partners.service';

const partnerConfigCacheInvalidation = {
  invalidateByPartnerId: jest.fn(),
};

const createService = (prisma: unknown): PartnersService =>
  new PartnersService(
    prisma as PrismaService,
    partnerConfigCacheInvalidation as never,
  );

describe('PartnersService', () => {
  const partnerId = 1;
  const prisma = {
    partner: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  let service: PartnersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
  });

  describe('update', () => {
    it('invalidates partner config cache after updating a partner', async () => {
      prisma.partner.findFirst
        .mockResolvedValueOnce({ id: partnerId, deletedAt: null })
        .mockResolvedValueOnce(null);
      prisma.partner.update.mockResolvedValue({
        id: partnerId,
        name: 'Acme',
        code: 'acme',
        lobbyUrl: 'https://lobby.example.com',
        webhookUrl: null,
        secret: 'secret',
        ipWhitelist: '*',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(partnerId, {
        name: 'Acme',
        lobbyUrl: 'https://lobby.example.com',
      });

      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });
  });

  describe('regenerateSecret', () => {
    it('invalidates partner config cache after regenerating a secret', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        id: partnerId,
        deletedAt: null,
      });
      prisma.partner.update.mockResolvedValue({
        id: partnerId,
        name: 'Acme',
        code: 'acme',
        lobbyUrl: null,
        webhookUrl: null,
        secret: 'new-secret',
        ipWhitelist: '*',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.regenerateSecret(partnerId);

      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });

    it('throws when the partner is not found', async () => {
      prisma.partner.findFirst.mockResolvedValue(null);

      await expect(service.regenerateSecret(partnerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('invalidates partner config cache after soft-deleting a partner', async () => {
      prisma.partner.findFirst.mockResolvedValue({
        id: partnerId,
        name: 'Acme',
        code: 'acme',
        lobbyUrl: null,
        webhookUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { users: 0 },
      });
      prisma.partner.update.mockResolvedValue({});

      await service.remove(partnerId);

      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).toHaveBeenCalledWith(partnerId);
    });

    it('throws when the partner is not found', async () => {
      prisma.partner.findFirst.mockResolvedValue(null);

      await expect(service.remove(partnerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        partnerConfigCacheInvalidation.invalidateByPartnerId,
      ).not.toHaveBeenCalled();
    });
  });
});
