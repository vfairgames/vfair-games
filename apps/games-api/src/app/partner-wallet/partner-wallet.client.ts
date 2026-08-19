import { Injectable, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import ky, { isHTTPError, type KyInstance } from 'ky';
import type {
  PartnerWalletBalanceResponse,
  PartnerWalletTransactionRequest,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import {
  assertWalletConfigured,
  type PartnerRuntimeConfig,
} from '../partner-config/partner-config-validation';
import { retryPartnerWalletCall } from './retry-partner-wallet-call';

type CachedWalletClient = {
  client: KyInstance;
  secret: string;
};

const toPartnerWalletHttpException = (error: unknown): HttpException => {
  if (!isHTTPError(error)) {
    return new HttpException(
      {
        err_code: 'partner_wallet_error',
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }

  const info: Record<string, unknown> = {
    message: error.message,
    status: error.response.status,
  };

  if (error.data !== undefined) {
    info.body = error.data;
  }

  return new HttpException(
    {
      err_code: 'partner_wallet_error',
      message: JSON.stringify(info),
    },
    error.response.status,
  );
};

@Injectable()
export class PartnerWalletClient {
  private readonly clientCache = new Map<string, CachedWalletClient>();

  constructor(
    @InjectPinoLogger(PartnerWalletClient.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    private readonly partnerConfig: PartnerConfigService,
  ) {}

  async getBalance(
    config: PartnerRuntimeConfig,
    playerId: string,
    currency: string,
  ): Promise<PartnerWalletBalanceResponse> {
    const client = await this.getClient(config);

    try {
      return await retryPartnerWalletCall({
        operation: () =>
          client
            .get('balance', {
              searchParams: { playerId, currency },
            })
            .json<PartnerWalletBalanceResponse>(),
        logger: this.logger,
        operationName: 'getBalance',
        context: { playerId, currency },
      });
    } catch (error: unknown) {
      throw toPartnerWalletHttpException(error);
    }
  }

  async processTransaction(
    config: PartnerRuntimeConfig,
    request: PartnerWalletTransactionRequest,
  ): Promise<PartnerWalletTransactionResponse> {
    const client = await this.getClient(config);

    try {
      return await retryPartnerWalletCall({
        operation: () =>
          client
            .post('transaction', { json: request })
            .json<PartnerWalletTransactionResponse>(),
        logger: this.logger,
        operationName: 'processTransaction',
        context: {
          requestId: request.requestId,
          type: request.type,
          playerId: request.playerId,
        },
      });
    } catch (error: unknown) {
      throw toPartnerWalletHttpException(error);
    }
  }

  private getClient = async (
    config: PartnerRuntimeConfig,
  ): Promise<KyInstance> => {
    const walletConfig = assertWalletConfigured(config);
    const prefixUrl = walletConfig.webhookUrl.replace(/\/$/, '');
    const cacheKey = `${walletConfig.partnerCode}:${prefixUrl}`;
    const secret = await this.partnerConfig.getPartnerSecret(
      walletConfig.partnerCode,
    );
    const cached = this.clientCache.get(cacheKey);

    if (cached && cached.secret === secret) {
      return cached.client;
    }

    const client = ky.create({
      prefix: prefixUrl,
      timeout: 10_000,
      hooks: {
        beforeRequest: [
          ({ request }) => {
            const partnerToken = this.jwtService.sign(
              { sub: walletConfig.partnerCode },
              { secret, expiresIn: '30s' },
            );
            request.headers.set('Authorization', `Bearer ${partnerToken}`);
          },
        ],
      },
    });

    this.clientCache.set(cacheKey, { client, secret });
    return client;
  };
}
