import { Transform } from 'class-transformer';
import { IsDateString, IsString, MinLength } from 'class-validator';
import { emptyToUndefined } from '../../common/dto/empty-to-undefined';
import { OptionalPositiveInt } from '../../common/dto/optional-positive-int.decorator';

export class DashboardKpiQueryDto {
  @OptionalPositiveInt()
  partnerId?: number;

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
