import { Transform } from 'class-transformer';
import { IsDateString, IsString, MinLength } from 'class-validator';
import { emptyToUndefined } from '../../common/dto/empty-to-undefined';

export class PlayerKpiQueryDto {
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(1)
  currency!: string;

  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateFrom!: string;

  @Transform(emptyToUndefined)
  @IsDateString({ strict: true })
  dateTo!: string;
}
