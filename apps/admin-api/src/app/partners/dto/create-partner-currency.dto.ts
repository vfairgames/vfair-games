import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsString, Max, Min } from 'class-validator';
import { VALID_CURRENCY_CODES } from './currency-codes';

export class CreatePartnerCurrencyDto {
  @IsString()
  @IsIn(VALID_CURRENCY_CODES)
  code!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  minBet!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  maxBet!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  maxWin!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  decimals!: number;
}
