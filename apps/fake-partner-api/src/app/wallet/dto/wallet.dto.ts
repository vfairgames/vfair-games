import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import type { PartnerWalletTxType } from '@vfair/game-contracts';

const WALLET_TX_TYPES = ['DEBIT', 'CREDIT', 'ROLLBACK'] as const;

export class WalletTransactionDto {
  @IsIn(WALLET_TX_TYPES)
  type!: PartnerWalletTxType;

  @IsString()
  @MinLength(1)
  playerId!: string;

  @IsString()
  @MinLength(1)
  currency!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @MinLength(1)
  requestId!: string;

  @IsString()
  @MinLength(1)
  gameId!: string;

  @IsOptional()
  @IsString()
  roundId?: string;

  @IsOptional()
  @IsString()
  reversesRequestId?: string;
}

export class WalletBalanceQueryDto {
  @IsString()
  @MinLength(1)
  playerId!: string;

  @IsString()
  @MinLength(1)
  currency!: string;
}
