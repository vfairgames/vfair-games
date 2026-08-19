jest.mock('@vfair/prisma-client', () => ({
  WalletTxStatus: {
    PENDING: 'PENDING',
    FAILED: 'FAILED',
  },
}));
jest.mock('../partner-config/partner-config.service', () => ({
  PartnerConfigService: class PartnerConfigService {},
}));
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./partner-wallet.client', () => ({
  PartnerWalletClient: class PartnerWalletClient {},
}));

import type { PinoLogger } from '@vfair/nest-utils';
import { WalletTxStatus } from '@vfair/prisma-client';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PartnerWalletClient } from './partner-wallet.client';
import { PartnerWalletService } from './partner-wallet.service';

describe('PartnerWalletService', () => {
  const partnerId = 7;
  const requestId = 'player-1:req-1:bet';
  let logger: PinoLogger;
  let prisma: PrismaService;
  let service: PartnerWalletService;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
    } as unknown as PinoLogger;
    prisma = {
      walletTransaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;
    service = new PartnerWalletService(
      logger,
      {} as PartnerWalletClient,
      {} as PartnerConfigService,
      prisma,
    );
  });

  it('marks only a matching pending transaction as failed', async () => {
    await service.markTransactionFailed(partnerId, requestId);

    expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
      where: {
        partnerId,
        requestId,
        status: WalletTxStatus.PENDING,
      },
      data: { status: WalletTxStatus.FAILED },
    });
  });

  it('logs and absorbs persistence failures', async () => {
    const error = new Error('database unavailable');
    (prisma.walletTransaction.updateMany as jest.Mock).mockRejectedValueOnce(
      error,
    );

    await expect(
      service.markTransactionFailed(partnerId, requestId),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      { error, partnerId, requestId },
      'Failed to mark wallet transaction as failed',
    );
  });
});
