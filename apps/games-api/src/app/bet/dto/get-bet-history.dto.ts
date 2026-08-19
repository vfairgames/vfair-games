import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AVAILABLE_GAME_IDS, type GameId } from '@vfair/game-contracts';

export class GetBetHistoryDto {
  @IsOptional()
  @IsString()
  @IsIn(AVAILABLE_GAME_IDS)
  @MaxLength(32)
  gameId?: GameId;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'cursor must be a numeric string' })
  @MaxLength(32)
  cursor?: string;
}
