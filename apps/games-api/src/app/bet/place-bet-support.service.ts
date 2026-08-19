import { HttpException, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  BetFailureStage,
  type PlaceBetRequestBase,
} from '@vfair/game-contracts';
import { roundToDecimals } from '@vfair/game-math';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import type { Prisma } from '@vfair/prisma-client';
import { RoundStatus } from '@vfair/prisma-client';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import {
  assertCurrencyConfigured,
  assertGameEnabled,
  type PartnerCurrencyRuntimeConfig,
  type PartnerGameRuntimeConfig,
  type PartnerRuntimeConfig,
} from '../partner-config/partner-config-validation';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionTokenPayload } from '../session/session-token.service';
import { mapHttpExceptionToWs } from '../session/map-http-exception-to-ws';

type PlayerWalletRequestSuffix = 'bet' | 'win';

const asErrorRecord = (payload: unknown): Record<string, unknown> | null => {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }

  return payload as Record<string, unknown>;
};

const readErrCodeFromPayload = (payload: unknown): string | null => {
  const record = asErrorRecord(payload);

  return typeof record?.err_code === 'string' ? record.err_code : null;
};

@Injectable()
export class PlaceBetSupportService {
  constructor(
    @InjectPinoLogger(PlaceBetSupportService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly partnerConfig: PartnerConfigService,
  ) {}

  toPlayerWalletRequestId(
    externalPlayerId: string,
    requestId: string,
    suffix: PlayerWalletRequestSuffix,
  ): string {
    return `${externalPlayerId}:${requestId}:${suffix}`;
  }

  async loadPartnerConfig(
    session: SessionTokenPayload,
  ): Promise<PartnerRuntimeConfig> {
    try {
      return await this.partnerConfig.getByPartnerCode(
        session.partnerCode,
        session.partnerId,
      );
    } catch (error: unknown) {
      const wsError = mapHttpExceptionToWs(error);

      if (wsError) {
        throw wsError;
      }

      throw new WsException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
  }

  resolveCurrencyConfig(
    config: PartnerRuntimeConfig,
    currencyCode: string,
  ): PartnerCurrencyRuntimeConfig {
    try {
      return assertCurrencyConfigured(config, currencyCode);
    } catch (error: unknown) {
      const wsError = mapHttpExceptionToWs(error);

      if (wsError) {
        throw wsError;
      }

      throw error;
    }
  }

  resolveGameConfig(
    config: PartnerRuntimeConfig,
    gameId: string,
  ): PartnerGameRuntimeConfig {
    try {
      return assertGameEnabled(config, gameId);
    } catch (error: unknown) {
      const wsError = mapHttpExceptionToWs(error);

      if (wsError) {
        throw wsError;
      }

      throw error;
    }
  }

  normalizePlaceBetError(error: unknown): WsException {
    if (error instanceof WsException) {
      return error;
    }

    const wsError = mapHttpExceptionToWs(error);

    if (wsError) {
      return wsError;
    }

    return new WsException({
      err_code: 'bet_failed',
      message: 'Bet failed',
    });
  }

  resolveErrCode(error: unknown): string {
    return (
      readErrCodeFromPayload(this.resolveErrorPayload(error)) ?? 'bet_failed'
    );
  }

  resolveErrorPayload(error: unknown): Record<string, unknown> {
    if (error instanceof WsException) {
      return (
        asErrorRecord(error.getError()) ?? {
          err_code: 'bet_failed',
          message: String(error),
        }
      );
    }

    if (error instanceof HttpException) {
      return (
        asErrorRecord(error.getResponse()) ?? {
          err_code: 'bet_failed',
          message: String(error),
        }
      );
    }

    return {
      err_code: 'bet_failed',
      message: String(error),
    };
  }

  async markRoundFailed(
    roundId: bigint,
    failureStage: BetFailureStage,
    currentOutcome: Prisma.JsonValue | null | undefined,
    errorPayload: Record<string, unknown>,
  ): Promise<void> {
    const baseOutcome =
      currentOutcome &&
      typeof currentOutcome === 'object' &&
      !Array.isArray(currentOutcome)
        ? (currentOutcome as Record<string, unknown>)
        : {};

    try {
      await this.prisma.gameRound.update({
        where: { id: roundId },
        data: {
          status: RoundStatus.FAILED,
          outcome: {
            ...baseOutcome,
            ...errorPayload,
            failure_stage: failureStage,
          } as Prisma.InputJsonValue,
          settledAt: new Date(),
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        {
          error,
          roundId: roundId.toString(),
          errCode: errorPayload.err_code,
          failureStage,
        },
        'Failed to mark round as failed',
      );
    }
  }

  validatePlaceBetStake(
    request: Pick<PlaceBetRequestBase, 'betAmount' | 'currency'>,
    currencyConfig: PartnerCurrencyRuntimeConfig,
  ): void {
    if (request.currency.decimals !== currencyConfig.currencyDecimals) {
      throw new WsException({
        err_code: 'invalid_currency',
        message: 'Currency decimals do not match partner configuration',
      });
    }

    if (
      request.betAmount < currencyConfig.minBet ||
      request.betAmount > currencyConfig.maxBet
    ) {
      throw new WsException({
        err_code: 'invalid_bet_amount',
        message: 'Bet amount is outside the allowed limits',
      });
    }

    if (
      roundToDecimals(request.betAmount, currencyConfig.currencyDecimals) !==
      request.betAmount
    ) {
      throw new WsException({
        err_code: 'invalid_bet_amount',
        message: 'Bet amount has too many decimal places',
      });
    }
  }
}
