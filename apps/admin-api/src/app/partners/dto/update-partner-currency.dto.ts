import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePartnerCurrencyDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  minBet?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  maxBet?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  maxWin?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  @IsOptional()
  decimals?: number;
}
