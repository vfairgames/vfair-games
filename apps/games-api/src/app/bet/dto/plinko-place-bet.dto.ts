import { Type } from 'class-transformer';
import {
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
  MAX_PLINKO_ROWS,
  MIN_PLINKO_ROWS,
  PLINKO_RISKS,
  type PlinkoRisk,
} from '@vfair/game-math';
import { BetCurrencyDto } from './dice-place-bet.dto';

export class PlinkoBetInputDto {
  @IsInt()
  @Min(MIN_PLINKO_ROWS)
  @Max(MAX_PLINKO_ROWS)
  rows!: number;

  @IsString()
  @IsIn(PLINKO_RISKS)
  risk!: PlinkoRisk;
}

export class PlinkoPlaceBetDto {
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
  @Type(() => PlinkoBetInputDto)
  gameData!: PlinkoBetInputDto;
}
