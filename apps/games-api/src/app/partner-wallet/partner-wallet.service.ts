import { Injectable } from '@nestjs/common';
import type {
  PartnerWalletTransactionRequest,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { WalletTxStatus } from '@vfair/prisma-client';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import {
  assertWalletConfigured,
  type PartnerRuntimeConfig,
} from '../partner-config/partner-config-validation';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerWalletClient } from './partner-wallet.client';

@Injectable()
export class PartnerWalletService {
  constructor(
    @InjectPinoLogger(PartnerWalletService.name)
    private readonly logger: PinoLogger,
    private readonly partnerWalletClient: PartnerWalletClient,
    private readonly partnerConfig: PartnerConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getBalance(
    partnerCode: string,
    partnerId: number,
    playerId: string,
    currency: string,
  ): Promise<number> {
    const config = await this.partnerConfig.getByPartnerCode(
      partnerCode,
      partnerId,
    );
    const walletConfig = assertWalletConfigured(config);
    const response = await this.partnerWalletClient.getBalance(
      walletConfig,
      playerId,
      currency,
    );

    return response.balance;
  }

  async debit(
    config: PartnerRuntimeConfig,
    input: Omit<PartnerWalletTransactionRequest, 'type'>,
  ): Promise<PartnerWalletTransactionResponse> {
    assertWalletConfigured(config);
    return this.partnerWalletClient.processTransaction(config, {
      ...input,
      type: 'DEBIT',
    });
  }

  async credit(
    config: PartnerRuntimeConfig,
    input: Omit<PartnerWalletTransactionRequest, 'type'>,
  ): Promise<PartnerWalletTransactionResponse> {
    assertWalletConfigured(config);
    return this.partnerWalletClient.processTransaction(config, {
      ...input,
      type: 'CREDIT',
    });
  }

  async markTransactionFailed(
    partnerId: number,
    requestId: string,
  ): Promise<void> {
    try {
      await this.prisma.walletTransaction.updateMany({
        where: {
          partnerId,
          requestId,
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
    } catch (error: unknown) {
      this.logger.error(
        { error, partnerId, requestId },
        'Failed to mark wallet transaction as failed',
      );
    }
  }
}
