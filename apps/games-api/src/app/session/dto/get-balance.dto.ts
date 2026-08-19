import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GetBalanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  currency!: string;
}
