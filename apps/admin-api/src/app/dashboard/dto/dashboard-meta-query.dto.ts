import { OptionalPositiveInt } from '../../common/dto/optional-positive-int.decorator';

export class DashboardMetaQueryDto {
  @OptionalPositiveInt()
  partnerId?: number;
}
