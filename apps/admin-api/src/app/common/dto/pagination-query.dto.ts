import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

const toPage = ({ value }: { value: unknown }) =>
  value == null || value === '' ? 1 : Number(value);

const toLimit = ({ value }: { value: unknown }) =>
  value == null || value === '' ? 10 : Number(value);

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(toPage)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(toLimit)
  limit = 10;
}
