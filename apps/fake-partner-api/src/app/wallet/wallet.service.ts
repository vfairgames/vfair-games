import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerWalletTxType, Prisma } from '@vfair/prisma-partner-client';
import type {
  PartnerWalletBalanceResponse,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { WalletTransactionDto } from './dto/wallet.dto';

type WalletTransactionRecord = {
  id: number;
  balanceAfter: { toNumber: () => number };
  type?: PartnerWalletTxType;
  amount?: { toNumber: () => number };
};

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(
    playerId: string,
    currency: string,
  ): Promise<PartnerWalletBalanceResponse> {
    const wallet = await this.findWallet(playerId, currency);

    return {
      balance: wallet.balance.toNumber(),
    };
  }

  async processTransaction(
    dto: WalletTransactionDto,
  ): Promise<PartnerWalletTransactionResponse> {
    const existing = await this.prisma.walletTransaction.findUnique({
      where: { requestId: dto.requestId },
      select: {
        id: true,
        balanceAfter: true,
        type: true,
        amount: true,
        gameId: true,
        player: {
          select: {
            username: true,
          },
        },
        wallet: {
          select: {
            currency: true,
          },
        },
      },
    });

    if (existing) {
      this.assertIdempotentReplayMatches(existing, dto);
      return this.toTransactionResponse(existing);
    }

    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { username: dto.playerId },
        select: { id: true },
      });

      if (!player) {
        throw new NotFoundException({
          err_code: 'player_not_found',
          message: `Player "${dto.playerId}" not found`,
        });
      }

      const lockedWallet = await tx.$queryRaw<
        Array<{ id: number; balance: Prisma.Decimal }>
      >`
        SELECT id, balance
        FROM "PlayerWallet"
        WHERE "playerId" = ${player.id}
          AND currency = ${dto.currency}
        FOR UPDATE
      `;
      const walletRow = lockedWallet[0];

      if (!walletRow) {
        throw new NotFoundException({
          err_code: 'wallet_not_found',
          message: `Wallet for currency "${dto.currency}" not found`,
        });
      }

      let reversesTransactionId: number | undefined;

      if (dto.reversesRequestId) {
        const reversed = await tx.walletTransaction.findUnique({
          where: { requestId: dto.reversesRequestId },
          select: { id: true },
        });

        if (!reversed) {
          throw new BadRequestException({
            err_code: 'reversal_not_found',
            message: 'Original transaction to reverse was not found',
          });
        }

        reversesTransactionId = reversed.id;
      }

      const currentBalance = walletRow.balance.toNumber();
      const nextBalance = this.applyTransactionAmount(
        dto.type,
        currentBalance,
        dto.amount,
      );

      if (nextBalance < 0) {
        throw new BadRequestException({
          err_code: 'insufficient_balance',
          message: 'Insufficient balance',
        });
      }

      const created = await tx.walletTransaction.create({
        data: {
          playerId: player.id,
          walletId: walletRow.id,
          type: dto.type as PartnerWalletTxType,
          amount: dto.amount,
          balanceAfter: nextBalance,
          requestId: dto.requestId,
          gameId: dto.gameId,
          roundId: dto.roundId,
          reversesTransactionId,
        },
        select: {
          id: true,
          balanceAfter: true,
        },
      });

      await tx.playerWallet.update({
        where: { id: walletRow.id },
        data: { balance: nextBalance },
      });

      return this.toTransactionResponse(created, currentBalance);
    });
  }

  private assertIdempotentReplayMatches = (
    existing: {
      type: PartnerWalletTxType;
      amount: { toNumber: () => number };
      gameId: string;
      player: { username: string };
      wallet: { currency: string };
    },
    dto: WalletTransactionDto,
  ): void => {
    const matches =
      existing.player.username === dto.playerId &&
      existing.type === dto.type &&
      existing.amount.toNumber() === dto.amount &&
      existing.wallet.currency === dto.currency &&
      existing.gameId === dto.gameId;

    if (!matches) {
      throw new ConflictException({
        err_code: 'idempotency_conflict',
        message: 'Request id was already used with different parameters',
      });
    }
  };

  private applyTransactionAmount = (
    type: WalletTransactionDto['type'],
    balance: number,
    amount: number,
  ): number => {
    if (type === 'DEBIT' || type === 'ROLLBACK') {
      return balance - amount;
    }

    return balance + amount;
  };

  private toTransactionResponse = (
    record: WalletTransactionRecord,
    balanceBefore?: number,
  ): PartnerWalletTransactionResponse => {
    const resolvedBalanceBefore =
      balanceBefore ??
      (record.type !== undefined && record.amount !== undefined
        ? this.deriveBalanceBefore(
            record.type,
            record.balanceAfter.toNumber(),
            record.amount.toNumber(),
          )
        : undefined);

    return {
      partnerTransactionId: String(record.id),
      balance: record.balanceAfter.toNumber(),
      ...(resolvedBalanceBefore !== undefined
        ? { balanceBefore: resolvedBalanceBefore }
        : {}),
    };
  };

  private deriveBalanceBefore = (
    type: PartnerWalletTxType,
    balanceAfter: number,
    amount: number,
  ): number => {
    if (type === 'DEBIT' || type === 'ROLLBACK') {
      return balanceAfter + amount;
    }

    return balanceAfter - amount;
  };

  private findWallet = async (playerId: string, currency: string) => {
    const wallet = await this.prisma.playerWallet.findFirst({
      where: {
        currency,
        player: { username: playerId },
      },
    });

    if (!wallet) {
      throw new NotFoundException({
        err_code: 'wallet_not_found',
        message: `Wallet for currency "${currency}" not found`,
      });
    }

    return wallet;
  };
}
