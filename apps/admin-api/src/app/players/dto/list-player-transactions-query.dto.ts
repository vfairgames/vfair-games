import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { emptyToUndefined } from '../../common/dto/empty-to-undefined';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const PLAYER_WALLET_TX_TYPES = ['debit', 'credit', 'rollback'] as const;

const PLAYER_WALLET_TX_STATUSES = [
  'pending',
  'confirmed',
  'failed',
  'rolled_back',
] as const;

type PlayerWalletTxTypeFilter = (typeof PLAYER_WALLET_TX_TYPES)[number];

type PlayerWalletTxStatusFilter = (typeof PLAYER_WALLET_TX_STATUSES)[number];

export class ListPlayerTransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(PLAYER_WALLET_TX_TYPES)
  type?: PlayerWalletTxTypeFilter;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(PLAYER_WALLET_TX_STATUSES)
  status?: PlayerWalletTxStatusFilter;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 18 })
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 18 })
  @Min(0)
  amountMax?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^\d+$/)
  roundId?: string;
}
