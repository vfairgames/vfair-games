import { BadRequestException } from '@nestjs/common';

export const parseRoundId = (value: string): bigint => {
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException({
      err_code: 'invalid_round_id',
      message: 'Round id must be a positive integer',
    });
  }

  const roundId = BigInt(value);

  if (roundId <= BigInt(0)) {
    throw new BadRequestException({
      err_code: 'invalid_round_id',
      message: 'Round id must be a positive integer',
    });
  }

  return roundId;
};
