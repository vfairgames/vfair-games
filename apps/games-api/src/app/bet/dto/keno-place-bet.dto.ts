import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  KENO_POOL_SIZE,
  KENO_RISKS,
  MAX_KENO_PICKS,
  MIN_KENO_PICKS,
  type KenoRisk,
} from '@vfair/game-math';
import { BetCurrencyDto } from './dice-place-bet.dto';

export class KenoBetInputDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(MIN_KENO_PICKS)
  @ArrayMaxSize(MAX_KENO_PICKS)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(KENO_POOL_SIZE, { each: true })
  picks!: number[];

  @IsString()
  @IsIn(KENO_RISKS)
  risk!: KenoRisk;
}

export class KenoPlaceBetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  requestId!: string;

  @IsNumber()
  @IsPositive()
  betAmount!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => BetCurrencyDto)
  currency!: BetCurrencyDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => KenoBetInputDto)
  gameData!: KenoBetInputDto;
}
