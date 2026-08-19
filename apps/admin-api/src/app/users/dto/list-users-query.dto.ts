import { IsOptional, IsString } from 'class-validator';
import { OptionalPositiveInt } from '../../common/dto/optional-positive-int.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  email?: string;

  @OptionalPositiveInt()
  partnerId?: number;

  @OptionalPositiveInt()
  roleId?: number;
}
