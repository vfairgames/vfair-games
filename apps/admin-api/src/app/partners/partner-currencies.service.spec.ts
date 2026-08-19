jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@vfair/prisma-client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code = 'P2002';
    },
  },
}));

import type { PrismaService } from '../prisma/prisma.service';
import { PartnerCurrenciesService } from './partner-currencies.service';

const partnerConfigCacheInvalidation = {
  invalidateByPartnerId: jest.fn(),
};

const decimal = (value: number) => ({
  toNumber: () => value,
});

const createService = (prisma: unknown): PartnerCurrenciesService =>
  new PartnerCurrenciesService(
    prisma as PrismaService,
    partnerConfigCacheInvalidation as never,
  );

describe('PartnerCurrenciesService', () => {
  const partnerId = 1;
  const currencyId = 10;
  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
    partnerCurrency: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: PartnerCurrenciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(prisma);
    prisma.partner.findFirst.mockResolvedValue({ id: partnerId });
  });

  it('invalidates partner config cache after creating a currency', async () => {
    prisma.partnerCurrency.create.mockResolvedValue({
      id: currencyId,
      partnerId,
      code: 'USD',
      minBet: decimal(1),
      maxBet: decimal(100),
      maxWin: decimal(1000),
      decimals: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(partnerId, {
      code: 'USD',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      decimals: 2,
    });

    expect(
      partnerConfigCacheInvalidation.invalidateByPartnerId,
    ).toHaveBeenCalledWith(partnerId);
  });

  it('invalidates partner config cache after updating a currency', async () => {
    prisma.partnerCurrency.findFirst.mockResolvedValue({
      id: currencyId,
      partnerId,
      code: 'USD',
      minBet: decimal(1),
      maxBet: decimal(100),
      maxWin: decimal(1000),
      decimals: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.partnerCurrency.update.mockResolvedValue({
      id: currencyId,
      partnerId,
      code: 'USD',
      minBet: decimal(2),
      maxBet: decimal(100),
      maxWin: decimal(1000),
      decimals: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.update(partnerId, currencyId, { minBet: 2 });

    expect(
      partnerConfigCacheInvalidation.invalidateByPartnerId,
    ).toHaveBeenCalledWith(partnerId);
  });

  it('invalidates partner config cache after removing a currency', async () => {
    prisma.partnerCurrency.findFirst.mockResolvedValue({
      id: currencyId,
      partnerId,
      code: 'USD',
    });
    prisma.partnerCurrency.delete.mockResolvedValue({});

    await service.remove(partnerId, currencyId);

    expect(
      partnerConfigCacheInvalidation.invalidateByPartnerId,
    ).toHaveBeenCalledWith(partnerId);
  });
});
