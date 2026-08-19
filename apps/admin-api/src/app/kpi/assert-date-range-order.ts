import { BadRequestException } from '@nestjs/common';

export const assertDateRangeOrder = (
  dateFrom: string,
  dateTo: string,
): void => {
  if (dateFrom > dateTo) {
    throw new BadRequestException({
      err_code: 'invalid_date_range',
      message: 'dateFrom must be on or before dateTo',
    });
  }
};
