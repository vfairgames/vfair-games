import { BadRequestException } from '@nestjs/common';

export const parseRoundId = (value: string): bigint => {
  try {
    const parsed = BigInt(value);

    if (parsed <= BigInt(0)) {
      throw new BadRequestException({
        err_code: 'invalid_round_id',
        message: 'Invalid round id',
      });
    }

    return parsed;
  } catch (error: unknown) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException({
      err_code: 'invalid_round_id',
      message: 'Invalid round id',
    });
  }
};
