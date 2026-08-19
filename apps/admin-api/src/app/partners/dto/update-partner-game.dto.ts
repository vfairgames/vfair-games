import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_GAME_RTP, MIN_GAME_RTP } from '@vfair/game-math';

export class UpdatePartnerGameDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_GAME_RTP)
  @Max(MAX_GAME_RTP)
  rtp?: number | null;
}
