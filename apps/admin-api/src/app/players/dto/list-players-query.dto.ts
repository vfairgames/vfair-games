import { IsOptional, IsString } from 'class-validator';
import { OptionalPositiveInt } from '../../common/dto/optional-positive-int.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPlayersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @OptionalPositiveInt()
  partnerId?: number;
}
