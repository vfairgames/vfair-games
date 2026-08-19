import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type {
  MinesBetResult,
  MinesPlaceAutoRoundRequest,
  MinesPlaceBetRequest,
  MinesRevealEntry,
  MinesRevealTileRequest,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { BetFailureStage, MINES_GAME_ID } from '@vfair/game-contracts';
import {
  calculateProfitOnWin,
  createMinesOdds,
  generateMineLayout,
  isMineHit,
  MINES_GRID_SIZE,
  MINES_MULTIPLIER_DECIMALS,
  roundToDecimals,
  type MinesOdds,
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
  type PartnerRuntimeConfig,
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

type MinesOutcomeState = {
  mineCount: number;
  gridSize: number;
  reveals: MinesRevealEntry[];
  multiplier: number;
  mineLayout?: number[];
};

type CreateActiveRoundInput = {
  session: SessionTokenPayload;
  request: MinesPlaceBetRequest;
  gameConfig: PartnerGameRuntimeConfig;
  betWalletRequestId: string;
};

type RecordBetLedgerInput = {
  session: SessionTokenPayload;
  round: RoundWithRelations;
  betWallet: PartnerWalletTransactionResponse;
  betWalletRequestId: string;
};

@Injectable()
export class MinesBetService {
  constructor(
    @InjectPinoLogger(MinesBetService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly placeBetSupport: PlaceBetSupportService,
    private readonly partnerWallet: PartnerWalletService,
    private readonly fairnessService: FairnessService,
    private readonly roundSettledPublisher: RoundSettledPublisher,
  ) {}

  async placeBet(
    session: SessionTokenPayload,
    request: MinesPlaceBetRequest,
  ): Promise<MinesBetResult> {
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
        MINES_GAME_ID,
      );

      this.validatePlaceBetRequest(request, currencyConfig, gameConfig.rtp);

      const playerId = Number(session.sub);

      return await this.fairnessService.withBetSettlementLock(
        playerId,
        async () => {
          await this.assertNoActiveMinesRound(playerId);

          const betWalletRequestId =
            this.placeBetSupport.toPlayerWalletRequestId(
              session.externalPlayerId,
              request.requestId,
              'bet',
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
              gameId: MINES_GAME_ID,
            });

            latestRound = await this.recordBetLedger({
              session,
              round: latestRound,
              betWallet,
              betWalletRequestId,
            });
            latestRoundId = latestRound.id.toString();

            return mapGameRoundToBetResult(latestRound) as MinesBetResult;
          } catch (error: unknown) {
            const wsError = this.placeBetSupport.normalizePlaceBetError(error);

            if (latestRound && failureStage) {
              await this.partnerWallet.markTransactionFailed(
                session.partnerId,
                betWalletRequestId,
              );

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
          gameId: MINES_GAME_ID,
        },
        'Place mines bet failed',
      );

      throw wsError;
    }
  }

  async revealTile(
    session: SessionTokenPayload,
    request: MinesRevealTileRequest,
  ): Promise<MinesBetResult> {
    const playerId = Number(session.sub);

    try {
      const config = await this.placeBetSupport.loadPartnerConfig(session);

      return await this.fairnessService.withBetSettlementLock(
        playerId,
        async () => {
          const round = await this.requireActiveRound(playerId);
          const currencyConfig = this.placeBetSupport.resolveCurrencyConfig(
            config,
            round.currency,
          );

          return this.applyReveal({
            session,
            config,
            currencyConfig,
            round,
            tile: request.tile,
          });
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
          playerId: session.sub,
          tile: request.tile,
          gameId: MINES_GAME_ID,
        },
        'Reveal mines tile failed',
      );

      throw wsError;
    }
  }

  async cashOut(session: SessionTokenPayload): Promise<MinesBetResult> {
    const playerId = Number(session.sub);
    let latestRound: RoundWithRelations | null = null;
    let latestRoundId: string | undefined;

    try {
      const config = await this.placeBetSupport.loadPartnerConfig(session);

      return await this.fairnessService.withBetSettlementLock(
        playerId,
        async () => {
          latestRound = await this.requireActiveRound(playerId);
          latestRoundId = latestRound.id.toString();
          const currencyConfig = this.placeBetSupport.resolveCurrencyConfig(
            config,
            latestRound.currency,
          );
          const outcome = this.parseOutcome(latestRound.outcome);

          if (outcome.reveals.length === 0) {
            throw new WsException({
              err_code: 'cash_out_requires_reveal',
              message: 'Cash out requires at least one revealed tile',
            });
          }

          const multiplier =
            outcome.reveals[outcome.reveals.length - 1]?.multiplier ?? 1;

          return this.settleWonRound({
            session,
            config,
            currencyConfig,
            round: latestRound,
            outcome,
            multiplier,
          });
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
          roundId: latestRoundId,
          playerId: session.sub,
          gameId: MINES_GAME_ID,
        },
        'Mines cash out failed',
      );

      throw wsError;
    }
  }

  async placeAutoRound(
    session: SessionTokenPayload,
    request: MinesPlaceAutoRoundRequest,
  ): Promise<MinesBetResult> {
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
        MINES_GAME_ID,
      );
      const minesOdds = createMinesOdds(gameConfig.rtp);

      this.validatePlaceBetRequest(request, currencyConfig, gameConfig.rtp);
      this.validateSelectedTiles(
        request.selectedTiles,
        request.gameData.mineCount,
        minesOdds,
      );
      this.assertProfitWithinMaxWin(
        request.betAmount,
        minesOdds.getMultiplier(
          request.gameData.mineCount,
          request.selectedTiles.length,
        ),
        currencyConfig,
      );

      const playerId = Number(session.sub);

      return await this.fairnessService.withBetSettlementLock(
        playerId,
        async () => {
          await this.assertNoActiveMinesRound(playerId);

          const betWalletRequestId =
            this.placeBetSupport.toPlayerWalletRequestId(
              session.externalPlayerId,
              request.requestId,
              'bet',
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
              gameId: MINES_GAME_ID,
            });

            latestRound = await this.recordBetLedger({
              session,
              round: latestRound,
              betWallet,
              betWalletRequestId,
            });
            latestRoundId = latestRound.id.toString();

            failureStage = BetFailureStage.Settle;

            for (const tile of request.selectedTiles) {
              const result = await this.applyReveal({
                session,
                config,
                currencyConfig,
                round: latestRound,
                tile,
              });

              if (result.status !== 'active') {
                return result;
              }

              latestRound = await this.requireActiveRound(playerId);
            }

            return await this.settleWonRound({
              session,
              config,
              currencyConfig,
              round: latestRound,
              outcome: this.parseOutcome(latestRound.outcome),
              multiplier:
                this.parseOutcome(latestRound.outcome).reveals.at(-1)
                  ?.multiplier ?? 1,
            });
          } catch (error: unknown) {
            const wsError = this.placeBetSupport.normalizePlaceBetError(error);

            if (latestRound) {
              if (failureStage === BetFailureStage.Debit) {
                await this.partnerWallet.markTransactionFailed(
                  session.partnerId,
                  betWalletRequestId,
                );
              }

              const current = await this.prisma.gameRound.findUnique({
                where: { id: latestRound.id },
                select: { status: true, outcome: true },
              });

              if (current?.status === RoundStatus.ACTIVE && failureStage) {
                await this.placeBetSupport.markRoundFailed(
                  latestRound.id,
                  failureStage,
                  current.outcome,
                  this.placeBetSupport.resolveErrorPayload(error),
                );
              }
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
          requestId: request.requestId,
          gameId: MINES_GAME_ID,
        },
        'Place mines auto round failed',
      );

      throw wsError;
    }
  }

  async getActiveRound(
    session: SessionTokenPayload,
  ): Promise<MinesBetResult | null> {
    const round = await this.prisma.gameRound.findFirst({
      where: {
        playerId: Number(session.sub),
        gameId: MINES_GAME_ID,
        status: RoundStatus.ACTIVE,
      },
      include: roundRelationsInclude,
      orderBy: { id: 'desc' },
    });

    if (!round) {
      return null;
    }

    return mapGameRoundToBetResult(round) as MinesBetResult;
  }

  private async applyReveal(input: {
    session: SessionTokenPayload;
    config: PartnerRuntimeConfig;
    currencyConfig: PartnerCurrencyRuntimeConfig;
    round: RoundWithRelations;
    tile: number;
  }): Promise<MinesBetResult> {
    const outcome = this.parseOutcome(input.round.outcome);
    const minesOdds = createMinesOdds(input.round.rtp.toNumber());

    if (
      !Number.isInteger(input.tile) ||
      input.tile < 0 ||
      input.tile >= MINES_GRID_SIZE
    ) {
      throw new WsException({
        err_code: 'invalid_tile',
        message: 'Tile index is invalid',
      });
    }

    if (outcome.reveals.some((entry) => entry.tile === input.tile)) {
      throw new WsException({
        err_code: 'tile_already_revealed',
        message: 'Tile has already been revealed',
      });
    }

    const mineLayout = generateMineLayout(
      input.round.rotation.serverSeed.serverSeed,
      input.round.rotation.clientSeed,
      input.round.nonce,
      outcome.mineCount,
    );
    const revealOrder = outcome.reveals.length + 1;
    const reveal: MinesRevealEntry = {
      tile: input.tile,
      order: revealOrder,
      multiplier: minesOdds.getMultiplier(outcome.mineCount, revealOrder),
    };
    const reveals = [...outcome.reveals, reveal];

    if (isMineHit(input.tile, mineLayout)) {
      const settled = await this.prisma.gameRound.update({
        where: { id: input.round.id },
        data: {
          status: RoundStatus.LOST,
          payoutMultiplier: 0,
          winAmount: 0,
          outcome: {
            mineCount: outcome.mineCount,
            gridSize: outcome.gridSize,
            reveals,
            multiplier: 0,
            mineLayout,
          },
          settledAt: new Date(),
        },
        include: roundRelationsInclude,
      });

      await publishRoundSettled(this.roundSettledPublisher, settled);
      return mapGameRoundToBetResult(settled) as MinesBetResult;
    }

    const nextOutcome: MinesOutcomeState = {
      ...outcome,
      reveals,
      multiplier: reveal.multiplier,
    };
    const hitsMaxWin = this.isProfitOverMaxWin(
      input.round.betAmount.toNumber(),
      reveal.multiplier,
      input.currencyConfig,
    );
    const isFullClear =
      reveals.length >= minesOdds.getGemCount(outcome.mineCount);

    if (hitsMaxWin || isFullClear) {
      return this.settleWonRound({
        session: input.session,
        config: input.config,
        currencyConfig: input.currencyConfig,
        round: input.round,
        outcome: nextOutcome,
        multiplier: reveal.multiplier,
        mineLayout,
      });
    }

    const updated = await this.prisma.gameRound.update({
      where: { id: input.round.id },
      data: {
        outcome: {
          mineCount: outcome.mineCount,
          gridSize: outcome.gridSize,
          reveals,
          multiplier: reveal.multiplier,
        },
      },
      include: roundRelationsInclude,
    });

    return mapGameRoundToBetResult(updated) as MinesBetResult;
  }

  private async settleWonRound(input: {
    session: SessionTokenPayload;
    config: PartnerRuntimeConfig;
    currencyConfig: PartnerCurrencyRuntimeConfig;
    round: RoundWithRelations;
    outcome: MinesOutcomeState;
    multiplier: number;
    mineLayout?: number[];
  }): Promise<MinesBetResult> {
    const mineLayout =
      input.mineLayout ??
      generateMineLayout(
        input.round.rotation.serverSeed.serverSeed,
        input.round.rotation.clientSeed,
        input.round.nonce,
        input.outcome.mineCount,
      );
    const profit = this.resolveCappedProfit(
      input.round.betAmount.toNumber(),
      input.multiplier,
      input.currencyConfig,
    );
    const winAmount = roundToDecimals(
      input.round.betAmount.toNumber() + profit,
      input.currencyConfig.currencyDecimals,
    );
    const winWalletRequestId = this.placeBetSupport.toPlayerWalletRequestId(
      input.session.externalPlayerId,
      input.round.requestId,
      'win',
    );

    let settled = await this.prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.update({
        where: { id: input.round.id },
        data: {
          status: RoundStatus.WON,
          payoutMultiplier: input.multiplier,
          winAmount,
          outcome: {
            mineCount: input.outcome.mineCount,
            gridSize: input.outcome.gridSize,
            reveals: input.outcome.reveals,
            multiplier: input.multiplier,
            mineLayout,
          },
          settledAt: new Date(),
        },
        include: roundRelationsInclude,
      });

      await tx.walletTransaction.create({
        data: {
          playerId: Number(input.session.sub),
          partnerId: input.session.partnerId,
          roundId: input.round.id,
          type: WalletTxType.CREDIT,
          status: WalletTxStatus.PENDING,
          currency: input.round.currency,
          amount: winAmount,
          requestId: winWalletRequestId,
        },
      });

      return round;
    });

    try {
      const winWallet = await this.partnerWallet.credit(input.config, {
        playerId: input.session.externalPlayerId,
        currency: settled.currency,
        amount: winAmount,
        requestId: winWalletRequestId,
        gameId: MINES_GAME_ID,
        roundId: settled.id.toString(),
      });

      settled = await this.recordWinSettlement({
        session: input.session,
        round: settled,
        winWallet,
        winWalletRequestId,
      });

      await publishRoundSettled(this.roundSettledPublisher, settled);
      return mapGameRoundToBetResult(settled) as MinesBetResult;
    } catch (error: unknown) {
      const wsError = this.placeBetSupport.normalizePlaceBetError(error);

      await this.partnerWallet.markTransactionFailed(
        input.session.partnerId,
        winWalletRequestId,
      );

      await this.placeBetSupport.markRoundFailed(
        settled.id,
        BetFailureStage.Credit,
        settled.outcome,
        this.placeBetSupport.resolveErrorPayload(error),
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
            gameId: MINES_GAME_ID,
            nonce,
            currency: input.request.currency.code,
            rtp: input.gameConfig.rtp,
            requestId: input.request.requestId,
            status: RoundStatus.ACTIVE,
            betAmount: input.request.betAmount,
            outcome: {
              mineCount: input.request.gameData.mineCount,
              gridSize: input.request.gameData.gridSize,
              reveals: [],
              multiplier: 1,
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

  private async assertNoActiveMinesRound(playerId: number): Promise<void> {
    const existing = await this.prisma.gameRound.findFirst({
      where: {
        playerId,
        gameId: MINES_GAME_ID,
        status: RoundStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (existing) {
      throw new WsException({
        err_code: 'active_round_exists',
        message: 'An active mines round already exists',
      });
    }
  }

  private async requireActiveRound(
    playerId: number,
  ): Promise<RoundWithRelations> {
    const round = await this.prisma.gameRound.findFirst({
      where: {
        playerId,
        gameId: MINES_GAME_ID,
        status: RoundStatus.ACTIVE,
      },
      include: roundRelationsInclude,
      orderBy: { id: 'desc' },
    });

    if (!round) {
      throw new WsException({
        err_code: 'no_active_round',
        message: 'No active mines round found',
      });
    }

    return round;
  }

  private parseOutcome(
    outcome: RoundWithRelations['outcome'],
  ): MinesOutcomeState {
    if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
      throw new WsException({
        err_code: 'invalid_round_outcome',
        message: 'Round outcome is invalid',
      });
    }

    const value = outcome as Record<string, unknown>;

    if (
      typeof value.mineCount !== 'number' ||
      typeof value.gridSize !== 'number' ||
      typeof value.multiplier !== 'number' ||
      !Array.isArray(value.reveals)
    ) {
      throw new WsException({
        err_code: 'invalid_round_outcome',
        message: 'Round outcome is invalid',
      });
    }

    return {
      mineCount: value.mineCount,
      gridSize: value.gridSize,
      multiplier: value.multiplier,
      reveals: value.reveals as MinesRevealEntry[],
      mineLayout: Array.isArray(value.mineLayout)
        ? (value.mineLayout as number[])
        : undefined,
    };
  }

  private validatePlaceBetRequest(
    request: MinesPlaceBetRequest,
    currencyConfig: PartnerCurrencyRuntimeConfig,
    rtp: number,
  ): void {
    this.placeBetSupport.validatePlaceBetStake(request, currencyConfig);

    if (request.gameData.gridSize !== MINES_GRID_SIZE) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Bet parameters are invalid',
      });
    }

    const validation = createMinesOdds(rtp).validate({
      mineCount: request.gameData.mineCount,
    });

    if (Object.keys(validation).length > 0) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Bet parameters are invalid',
      });
    }
  }

  private validateSelectedTiles(
    selectedTiles: readonly number[],
    mineCount: number,
    minesOdds: MinesOdds,
  ): void {
    const maxReveals = minesOdds.getGemCount(mineCount);

    if (
      selectedTiles.length === 0 ||
      selectedTiles.length > maxReveals ||
      new Set(selectedTiles).size !== selectedTiles.length ||
      selectedTiles.some(
        (tile) =>
          !Number.isInteger(tile) || tile < 0 || tile >= MINES_GRID_SIZE,
      )
    ) {
      throw new WsException({
        err_code: 'invalid_bet',
        message: 'Selected tiles are invalid',
      });
    }
  }

  private assertProfitWithinMaxWin(
    betAmount: number,
    multiplier: number,
    currencyConfig: PartnerCurrencyRuntimeConfig,
  ): void {
    if (this.isProfitOverMaxWin(betAmount, multiplier, currencyConfig)) {
      throw new WsException({
        err_code: 'bet_limit_exceeded',
        message: 'Win amount exceeds the configured maximum',
      });
    }
  }

  private isProfitOverMaxWin(
    betAmount: number,
    multiplier: number,
    currencyConfig: PartnerCurrencyRuntimeConfig,
  ): boolean {
    return (
      calculateProfitOnWin(
        betAmount,
        multiplier,
        currencyConfig.currencyDecimals,
        MINES_MULTIPLIER_DECIMALS,
      ) > currencyConfig.maxWin
    );
  }

  private resolveCappedProfit(
    betAmount: number,
    multiplier: number,
    currencyConfig: PartnerCurrencyRuntimeConfig,
  ): number {
    return roundToDecimals(
      Math.min(
        calculateProfitOnWin(
          betAmount,
          multiplier,
          currencyConfig.currencyDecimals,
          MINES_MULTIPLIER_DECIMALS,
        ),
        currencyConfig.maxWin,
      ),
      currencyConfig.currencyDecimals,
    );
  }
}
