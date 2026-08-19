import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
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
  MAX_MINE_COUNT,
  MIN_MINE_COUNT,
  MINES_GRID_SIZE,
} from '@vfair/game-math';
import { BetCurrencyDto } from './dice-place-bet.dto';

export class MinesBetInputDto {
  @IsInt()
  @Min(MIN_MINE_COUNT)
  @Max(MAX_MINE_COUNT)
  mineCount!: number;

  @IsInt()
  @Min(MINES_GRID_SIZE)
  @Max(MINES_GRID_SIZE)
  gridSize!: number;
}

export class MinesPlaceBetDto {
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
  @Type(() => MinesBetInputDto)
  gameData!: MinesBetInputDto;
}

export class MinesRevealTileDto {
  @IsInt()
  @Min(0)
  @Max(MINES_GRID_SIZE - 1)
  tile!: number;
}

export class MinesPlaceAutoRoundDto extends MinesPlaceBetDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MINES_GRID_SIZE - MIN_MINE_COUNT)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(MINES_GRID_SIZE - 1, { each: true })
  selectedTiles!: number[];
}
