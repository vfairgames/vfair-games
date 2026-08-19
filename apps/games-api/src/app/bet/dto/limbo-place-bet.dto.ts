import { Type } from 'class-transformer';
import {
  IsDefined,
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
  MAX_CRASH_MULTIPLIER,
  MAX_LIMBO_WIN_CHANCE_PERCENT,
  MIN_LIMBO_WIN_CHANCE_PERCENT,
  MIN_TARGET_MULTIPLIER,
} from '@vfair/game-math';
import { BetCurrencyDto } from './dice-place-bet.dto';

export class LimboBetInputDto {
  @IsNumber()
  @Min(MIN_TARGET_MULTIPLIER)
  @Max(MAX_CRASH_MULTIPLIER)
  targetMultiplier!: number;

  @IsNumber()
  @Min(MIN_LIMBO_WIN_CHANCE_PERCENT)
  @Max(MAX_LIMBO_WIN_CHANCE_PERCENT)
  winChance!: number;
}

export class LimboPlaceBetDto {
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
  @Type(() => LimboBetInputDto)
  gameData!: LimboBetInputDto;
}
