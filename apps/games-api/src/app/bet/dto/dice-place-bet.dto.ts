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
import type { Currency } from '@vfair/app-common';
import { DICE_GAME_MODES, type DiceGameMode } from '@vfair/game-contracts';

const MIN_DICE_WIN_CHANCE = 0.01;
const MAX_DICE_WIN_CHANCE = 99.99;
const MIN_DICE_MULTIPLIER = 1.01;

export class BetCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code!: Currency;

  @IsInt()
  @Min(0)
  @Max(18)
  decimals!: number;
}

export class DiceBetInputDto {
  @IsIn(DICE_GAME_MODES)
  gameMode!: DiceGameMode;

  @IsNumber()
  @Min(MIN_DICE_MULTIPLIER)
  multiplier!: number;

  @IsNumber()
  @Min(MIN_DICE_WIN_CHANCE)
  @Max(MAX_DICE_WIN_CHANCE)
  sliderValue!: number;

  @IsNumber()
  @Min(MIN_DICE_WIN_CHANCE)
  @Max(MAX_DICE_WIN_CHANCE)
  winChance!: number;
}

export class DicePlaceBetDto {
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
  @Type(() => DiceBetInputDto)
  gameData!: DiceBetInputDto;
}
