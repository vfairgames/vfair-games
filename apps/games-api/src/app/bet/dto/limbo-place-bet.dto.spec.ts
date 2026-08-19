import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LimboPlaceBetDto } from './limbo-place-bet.dto';

const validPlaceBet = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    targetMultiplier: 2,
    winChance: 49,
  },
};

describe('LimboPlaceBetDto', () => {
  it('accepts a valid place bet payload', async () => {
    const dto = plainToInstance(LimboPlaceBetDto, validPlaceBet);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects a payload missing gameData', async () => {
    const dto = plainToInstance(LimboPlaceBetDto, {
      ...validPlaceBet,
      gameData: undefined,
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a target multiplier below the minimum', async () => {
    const dto = plainToInstance(LimboPlaceBetDto, {
      ...validPlaceBet,
      gameData: {
        ...validPlaceBet.gameData,
        targetMultiplier: 1,
      },
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
