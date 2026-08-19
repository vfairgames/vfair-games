import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { AVAILABLE_GAME_IDS, type GameId } from '@vfair/game-contracts';
import { emptyToUndefined } from '../../common/dto/empty-to-undefined';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const PLAYER_ROUND_STATUSES = [
  'won',
  'lost',
  'active',
  'failed',
] as const;

export type PlayerRoundStatusFilter = (typeof PLAYER_ROUND_STATUSES)[number];

export class ListPlayerRoundsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsIn(AVAILABLE_GAME_IDS)
  @MaxLength(32)
  gameId?: GameId;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(PLAYER_ROUND_STATUSES)
  status?: PlayerRoundStatusFilter;

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
  betAmountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 18 })
  @Min(0)
  betAmountMax?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^\d+$/)
  roundId?: string;
}
