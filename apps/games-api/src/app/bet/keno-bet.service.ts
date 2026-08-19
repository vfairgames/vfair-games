import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type {
  KenoBetResult,
  KenoPlaceBetRequest,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { BetFailureStage, KENO_GAME_ID } from '@vfair/game-contracts';
import {
  calculateProfitOnWin,
  createKenoOdds,
  drawKenoNumbers,
  KENO_MULTIPLIER_DECIMALS,
  roundToDecimals,
} from '@vfair/game-math';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import {
  Prisma,
  RoundStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';
import {
  type PartnerCurrencyRuntimeConfig,
  type PartnerGameRuntimeConfig,
} from '../partner-config/partner-config-validation';
import { PrismaService } from '../prisma/prisma.service';
import { FairnessService } from '../fairness/fairness.service';
import { PartnerWalletService } from '../partner-wallet/partner-wallet.service';
import type { SessionTokenPayload } from '../session/session-token.service';
import { publishRoundSettled } from '../messaging/publish-round-settled';
import { RoundSettledPublisher } from '../messaging/round-settled.publisher';
import { PlaceBetSupportService } from './place-bet-support.service';
import { mapGameRoundToBetResult } from './round.mapper';
import { roundRelationsInclude } from './round.types';
import type { RoundWithRelations } from './round.types';

type CreateActiveRoundInput = {
  session: SessionTokenPayload;
  request: KenoPlaceBetRequest;
  gameConfig: PartnerGameRuntimeConfig;
  betWalletRequestId: string;
  normalizedPicks: number[];
};

type RecordBetLedgerInput = {
  session: SessionTokenPayload;
  round: RoundWithRelations;
  betWallet: PartnerWalletTransactionResponse;
  betWalletRequestId: string;
};

type SettleRoundInput = {
  session: SessionTokenPayload;
  round: RoundWithRelations;
  request: KenoPlaceBetRequest;
  currencyConfig: PartnerCurrencyRuntimeConfig;
  winWalletRequestId: string;
  normalizedPicks: number[];
};

@Injectable()
export class KenoBetService {
  constructor(
    @InjectPinoLogger(KenoBetService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly placeBetSupport: PlaceBetSupportService,
    private readonly partnerWallet: PartnerWalletService,
    private readonly fairnessService: FairnessService,
    private readonly roundSettledPublisher: RoundSettledPublisher,
  ) {}

  async placeBet(
    session: SessionTokenPayload,
    request: KenoPlaceBetRequest,
  ): Promise<KenoBetResult> {
    let latestRound: RoundWithRelations | null = null;
    let latestRoundId: string | undefined;
    let failureStage: BetFailureStage | undefined;

    try {
      const config = await this.placeBetSupport.loadPartnerConfig(session);
      const currencyConfig = this.placeBetSupport.resolveCurrencyConfig(
        config,
        request.currency.code,
      );
      const gameConfig = this.placeBetSupport.resolveGameConfig(
        config,
        KENO_GAME_ID,
      );

      const normalizedPicks = this.validatePlaceBetRequest(
        request,
        currencyConfig,
      );

      const playerId = Number(session.sub);

      return await this.fairnessService.withBetSettlementLock(
        playerId,
        async () => {
          const betWalletRequestId =
            this.placeBetSupport.toPlayerWalletRequestId(
              session.externalPlayerId,
              request.requestId,
              'bet',
            );
          const winWalletRequestId =
            this.placeBetSupport.toPlayerWalletRequestId(
              session.externalPlayerId,
              request.requestId,
              'win',
            );

          failureStage = BetFailureStage.Debit;

          try {
            latestRound = await this.createActiveRound({
              session,
              request,
              gameConfig,
              betWalletRequestId,
              normalizedPicks,
            });
            latestRoundId = latestRound.id.toString();

            const betWallet = await this.partnerWallet.debit(config, {
              playerId: session.externalPlayerId,
              currency: request.currency.code,
              amount: request.betAmount,
              requestId: betWalletRequestId,
              gameId: KENO_GAME_ID,
            });

            latestRound = await this.recordBetLedger({
              session,
              round: latestRound,
              betWallet,
              betWalletRequestId,
            });
            latestRoundId = latestRound.id.toString();

            failureStage = BetFailureStage.Settle;
            latestRound = await this.settleRound({
              session,
              round: latestRound,
              request,
              currencyConfig,
              winWalletRequestId,
              normalizedPicks,
            });
            latestRoundId = latestRound.id.toString();

            const winAmount = latestRound.winAmount?.toNumber() ?? 0;

            if (winAmount > 0) {
              failureStage = BetFailureStage.Credit;
              const winWallet = await this.partnerWallet.credit(config, {
                playerId: session.externalPlayerId,
                currency: request.currency.code,
                amount: winAmount,
                requestId: winWalletRequestId,
                gameId: KENO_GAME_ID,
                roundId: latestRound.id.toString(),
              });

              latestRound = await this.recordWinSettlement({
                session,
                round: latestRound,
                winWallet,
                winWalletRequestId,
              });
              latestRoundId = latestRound.id.toString();
            }

            await publishRoundSettled(this.roundSettledPublisher, latestRound);

            return mapGameRoundToBetResult(latestRound) as KenoBetResult;
          } catch (error: unknown) {
            const wsError = this.placeBetSupport.normalizePlaceBetError(error);

            if (latestRound && failureStage) {
              const walletRequestId =
                failureStage === BetFailureStage.Debit
                  ? betWalletRequestId
                  : failureStage === BetFailureStage.Credit
                    ? winWalletRequestId
                    : undefined;

              if (walletRequestId) {
                await this.partnerWallet.markTransactionFailed(
                  session.partnerId,
                  walletRequestId,
                );
              }

              await this.placeBetSupport.markRoundFailed(
                latestRound.id,
                failureStage,
                latestRound.outcome,
                this.placeBetSupport.resolveErrorPayload(error),
              );
            }

            throw wsError;
          }
        },
      );
    } catch (error: unknown) {
      const wsError =
        error instanceof WsException
          ? error
          : this.placeBetSupport.normalizePlaceBetError(error);

      this.logger.error(
        {
          error,
          errCode: this.placeBetSupport.resolveErrCode(wsError),
          failureStage,
          roundId: latestRoundId,
          playerId: session.sub,
          externalPlayerId: session.externalPlayerId,
          partnerId: session.partnerId,
          requestId: request.requestId,
          gameId: KENO_GAME_ID,
        },
        'Place bet failed',
      );

      throw wsError;
    }
  }

  private async createActiveRound(
    input: CreateActiveRoundInput,
  ): Promise<RoundWithRelations> {
    const playerId = Number(input.session.sub);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let rotation = await this.fairnessService.lockOpenRotation(
          tx,
          playerId,
        );

        if (!rotation) {
          await this.fairnessService.bootstrapInTransaction(tx, playerId);
          rotation = await this.fairnessService.lockOpenRotation(tx, playerId);
        }

        if (!rotation) {
          throw new WsException({
            err_code: 'fairness_state_invalid',
            message: 'Active fairness rotation was not found',
          });
        }

        const nonce = rotation.nonceCount;

        const round = await tx.gameRound.create({
          data: {
            rotationId: rotation.id,
            playerId,
            partnerId: input.session.partnerId,
            gameId: KENO_GAME_ID,
            nonce,
            currency: input.request.currency.code,
            rtp: input.gameConfig.rtp,
            requestId: input.request.requestId,
            status: RoundStatus.ACTIVE,
            betAmount: input.request.betAmount,
            outcome: {
              picks: input.normalizedPicks,
              risk: input.request.gameData.risk,
            },
          },
          include: roundRelationsInclude,
        });

        await tx.walletTransaction.create({
          data: {
            playerId,
            partnerId: input.session.partnerId,
            roundId: round.id,
            type: WalletTxType.DEBIT,
            status: WalletTxStatus.PENDING,
            currency: input.request.currency.code,
            amount: input.request.betAmount,
            requestId: input.betWalletRequestId,
          },
        });

        await tx.fairnessRotation.update({
          where: { id: rotation.id },
          data: { nonceCount: nonce + 1 },
        });

        return round;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new WsException({
          err_code: 'round_create_conflict',
          message: 'Round could not be created',
        });
      }

      throw error;
    }
  }

  private async recordBetLedger(
    input: RecordBetLedgerInput,
  ): Promise<RoundWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.walletTransaction.update({
        where: {
          partnerId_requestId: {
            partnerId: input.session.partnerId,
            requestId: input.betWalletRequestId,
          },
        },
        data: {
          status: WalletTxStatus.CONFIRMED,
          balanceBefore: input.betWallet.balanceBefore,
          balanceAfter: input.betWallet.balance,
          partnerTransactionId: input.betWallet.partnerTransactionId,
        },
      });

      return tx.gameRound.update({
        where: { id: input.round.id },
        data: {
          balanceAfter: input.betWallet.balance,
        },
        include: roundRelationsInclude,
      });
    });
  }

  private async settleRound(
    input: SettleRoundInput,
  ): Promise<RoundWithRelations> {
    const { risk } = input.request.gameData;
    const pickCount = input.normalizedPicks.length;
    const drawnNumbers = drawKenoNumbers(
      input.round.rotation.serverSeed.serverSeed,
      input.round.rotation.clientSeed,
      input.round.nonce,
    );
    const odds = createKenoOdds();
    const hitCount = odds.countHits(input.normalizedPicks, drawnNumbers);
    const multiplier = odds.getMultiplier(pickCount, risk, hitCount);
    const profit = calculateProfitOnWin(
      input.request.betAmount,
      multiplier,
      input.currencyConfig.currencyDecimals,
      KENO_MULTIPLIER_DECIMALS,
    );
    const winAmount = roundToDecimals(
      input.request.betAmount + profit,
      input.currencyConfig.currencyDecimals,
    );
    const won = winAmount >= input.request.betAmount;

    if (profit > input.currencyConfig.maxWin) {
      throw new WsException({
        err_code: 'bet_limit_exceeded',
        message: 'Win amount exceeds the configured maximum',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.update({
        where: { id: input.round.id },
        data: {
          status: won ? RoundStatus.WON : RoundStatus.LOST,
          payoutMultiplier: multiplier,
          winAmount,
          outcome: {
            picks: input.normalizedPicks,
            risk,
            drawnNumbers,
            hitCount,
            multiplier,
          },
          settledAt: new Date(),
        },
        include: roundRelationsInclude,
      });

      if (winAmount > 0) {
        await tx.walletTransaction.create({
          data: {
            playerId: Number(input.session.sub),
            partnerId: input.session.partnerId,
            roundId: input.round.id,
            type: WalletTxType.CREDIT,
            status: WalletTxStatus.PENDING,
            currency: input.round.currency,
            amount: winAmount,
            requestId: input.winWalletRequestId,
          },
        });
      }

      return round;
    });
  }

  private async recordWinSettlement(input: {
    session: SessionTokenPayload;
    round: RoundWithRelations;
    winWallet: PartnerWalletTransactionResponse;
    winWalletRequestId: string;
  }): Promise<RoundWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.walletTransaction.update({
        where: {
          partnerId_requestId: {
            partnerId: input.session.partnerId,
            requestId: input.winWalletRequestId,
          },
        },
        data: {
          status: WalletTxStatus.CONFIRMED,
          balanceBefore: input.winWallet.balanceBefore,
          balanceAfter: input.winWallet.balance,
          partnerTransactionId: input.winWallet.partnerTransactionId,
        },
      });

      return tx.gameRound.update({
        where: { id: input.round.id },
        data: {
          balanceAfter: input.winWallet.balance,
        },
        include: roundRelationsInclude,
      });
    });
  }

  private validatePlaceBetRequest(
    request: KenoPlaceBetRequest,
    currencyConfig: PartnerCurrencyRuntimeConfig,
  ): number[] {
    this.placeBetSupport.validatePlaceBetStake(request, currencyConfig);

    const odds = createKenoOdds();
    const validation = odds.validate({
      picks: request.gameData.picks,
      risk: request.gameData.risk,
    });

    if (Object.keys(validation).length > 0) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Bet parameters are invalid',
      });
    }

    const normalizedPicks = odds.normalizePicks(request.gameData.picks);
    const paytable = odds.getPaytable(
      normalizedPicks.length,
      request.gameData.risk,
    );
    const maxMultiplier = Math.max(...paytable);
    const maxProfit = calculateProfitOnWin(
      request.betAmount,
      maxMultiplier,
      currencyConfig.currencyDecimals,
      KENO_MULTIPLIER_DECIMALS,
    );

    if (maxProfit > currencyConfig.maxWin) {
      throw new WsException({
        err_code: 'bet_limit_exceeded',
        message: 'Win amount exceeds the configured maximum',
      });
    }

    return normalizedPicks;
  }
}
