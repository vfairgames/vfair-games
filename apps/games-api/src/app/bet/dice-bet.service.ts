import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type {
  DiceBetResult,
  DicePlaceBetRequest,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { BetFailureStage, DICE_GAME_ID } from '@vfair/game-contracts';
import {
  calculateProfitOnWin,
  createDiceOdds,
  isWon,
  rollDice,
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
  request: DicePlaceBetRequest;
  gameConfig: PartnerGameRuntimeConfig;
  betWalletRequestId: string;
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
  request: DicePlaceBetRequest;
  gameConfig: PartnerGameRuntimeConfig;
  currencyConfig: PartnerCurrencyRuntimeConfig;
  winWalletRequestId: string;
};

@Injectable()
export class DiceBetService {
  constructor(
    @InjectPinoLogger(DiceBetService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly placeBetSupport: PlaceBetSupportService,
    private readonly partnerWallet: PartnerWalletService,
    private readonly fairnessService: FairnessService,
    private readonly roundSettledPublisher: RoundSettledPublisher,
  ) {}

  async placeBet(
    session: SessionTokenPayload,
    request: DicePlaceBetRequest,
  ): Promise<DiceBetResult> {
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
        DICE_GAME_ID,
      );

      this.validatePlaceBetRequest(request, currencyConfig, gameConfig.rtp);

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
            });
            latestRoundId = latestRound.id.toString();

            const betWallet = await this.partnerWallet.debit(config, {
              playerId: session.externalPlayerId,
              currency: request.currency.code,
              amount: request.betAmount,
              requestId: betWalletRequestId,
              gameId: DICE_GAME_ID,
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
              gameConfig,
              currencyConfig,
              winWalletRequestId,
            });
            latestRoundId = latestRound.id.toString();

            if (latestRound.status === RoundStatus.LOST) {
              await publishRoundSettled(
                this.roundSettledPublisher,
                latestRound,
              );
              return mapGameRoundToBetResult(latestRound) as DiceBetResult;
            }

            if (latestRound.status === RoundStatus.WON) {
              const winAmount = latestRound.winAmount?.toNumber() ?? 0;

              failureStage = BetFailureStage.Credit;
              const winWallet = await this.partnerWallet.credit(config, {
                playerId: session.externalPlayerId,
                currency: request.currency.code,
                amount: winAmount,
                requestId: winWalletRequestId,
                gameId: DICE_GAME_ID,
                roundId: latestRound.id.toString(),
              });

              latestRound = await this.recordWinSettlement({
                session,
                round: latestRound,
                winWallet,
                winWalletRequestId,
              });
              latestRoundId = latestRound.id.toString();

              await publishRoundSettled(
                this.roundSettledPublisher,
                latestRound,
              );
            }

            return mapGameRoundToBetResult(latestRound) as DiceBetResult;
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
          gameId: DICE_GAME_ID,
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
            gameId: DICE_GAME_ID,
            nonce,
            currency: input.request.currency.code,
            rtp: input.gameConfig.rtp,
            requestId: input.request.requestId,
            status: RoundStatus.ACTIVE,
            betAmount: input.request.betAmount,
            outcome: {
              gameMode: input.request.gameData.gameMode,
              sliderValue: input.request.gameData.sliderValue,
              multiplier: input.request.gameData.multiplier,
              winChance: input.request.gameData.winChance,
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
    const rolledValue = rollDice(
      input.round.rotation.serverSeed.serverSeed,
      input.round.rotation.clientSeed,
      input.round.nonce,
    );
    const resolvedOdds = createDiceOdds(input.gameConfig.rtp).calculate({
      gameMode: input.request.gameData.gameMode,
      sliderValue: input.request.gameData.sliderValue,
    });
    const won = isWon({
      gameMode: input.request.gameData.gameMode,
      rolledValue,
      sliderValue: resolvedOdds.sliderValue,
    });
    const payoutMultiplier = won ? resolvedOdds.multiplier : 0;
    const profit = won
      ? calculateProfitOnWin(
          input.request.betAmount,
          resolvedOdds.multiplier,
          input.currencyConfig.currencyDecimals,
        )
      : 0;

    if (won && profit > input.currencyConfig.maxWin) {
      throw new WsException({
        err_code: 'bet_limit_exceeded',
        message: 'Win amount exceeds the configured maximum',
      });
    }

    const winAmount = won
      ? roundToDecimals(
          input.request.betAmount + profit,
          input.currencyConfig.currencyDecimals,
        )
      : 0;

    return this.prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.update({
        where: { id: input.round.id },
        data: {
          status: won ? RoundStatus.WON : RoundStatus.LOST,
          payoutMultiplier,
          winAmount: won ? winAmount : 0,
          outcome: {
            rolledValue,
            sliderValue: resolvedOdds.sliderValue,
            gameMode: input.request.gameData.gameMode,
            multiplier: payoutMultiplier,
            winChance: resolvedOdds.winChance,
          },
          settledAt: new Date(),
        },
        include: roundRelationsInclude,
      });

      if (won) {
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
    request: DicePlaceBetRequest,
    currencyConfig: PartnerCurrencyRuntimeConfig,
    rtp: number,
  ): void {
    this.placeBetSupport.validatePlaceBetStake(request, currencyConfig);

    const odds = createDiceOdds(rtp);
    const validation = odds.validate({
      gameMode: request.gameData.gameMode,
      multiplier: request.gameData.multiplier,
      sliderValue: request.gameData.sliderValue,
      winChance: request.gameData.winChance,
    });

    if (Object.keys(validation).length > 0) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Bet parameters are invalid',
      });
    }

    const resolvedOdds = odds.calculate({
      gameMode: request.gameData.gameMode,
      sliderValue: request.gameData.sliderValue,
    });

    if (
      resolvedOdds.multiplier !== request.gameData.multiplier ||
      resolvedOdds.winChance !== request.gameData.winChance ||
      resolvedOdds.sliderValue !== request.gameData.sliderValue
    ) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Bet parameters are invalid',
      });
    }

    const profit = calculateProfitOnWin(
      request.betAmount,
      resolvedOdds.multiplier,
      currencyConfig.currencyDecimals,
    );

    if (profit > currencyConfig.maxWin) {
      throw new WsException({
        err_code: 'bet_limit_exceeded',
        message: 'Win amount exceeds the configured maximum',
      });
    }
  }
}
