import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  AVAILABLE_GAME_IDS,
  BetFailureStage,
  type GameId,
} from '@vfair/game-contracts';
import { emptyToUndefined } from '../../common/dto/empty-to-undefined';
import { OptionalPositiveInt } from '../../common/dto/optional-positive-int.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const optionalQueryBoolean = ({ value }: { value: unknown }) => {
  if (value === '' || value == null) {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
};

export class ListFailedRoundsQueryDto extends PaginationQueryDto {
  @OptionalPositiveInt()
  partnerId?: number;

  @OptionalPositiveInt()
  playerId?: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^\d+$/)
  roundId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(256)
  requestId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsIn(AVAILABLE_GAME_IDS)
  @MaxLength(32)
  gameId?: GameId;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(Object.values(BetFailureStage))
  failureStage?: BetFailureStage;

  @IsOptional()
  @Transform(optionalQueryBoolean)
  @IsBoolean()
  solved?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateTo?: string;
}
