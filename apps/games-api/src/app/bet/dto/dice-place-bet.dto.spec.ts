import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DicePlaceBetDto } from './dice-place-bet.dto';
import { GetBetHistoryDto } from './get-bet-history.dto';

const validPlaceBet = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    gameMode: 'rollUnder',
    multiplier: 2,
    sliderValue: 50,
    winChance: 49.5,
  },
};

describe('DicePlaceBetDto', () => {
  it('accepts a valid place bet payload', async () => {
    const dto = plainToInstance(DicePlaceBetDto, validPlaceBet);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects a payload missing gameData', async () => {
    const dto = plainToInstance(DicePlaceBetDto, {
      ...validPlaceBet,
      gameData: undefined,
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid game mode', async () => {
    const dto = plainToInstance(DicePlaceBetDto, {
      ...validPlaceBet,
      gameData: {
        ...validPlaceBet.gameData,
        gameMode: 'invalid',
      },
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('GetBetHistoryDto', () => {
  it('accepts an empty payload', async () => {
    const dto = plainToInstance(GetBetHistoryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown game id', async () => {
    const dto = plainToInstance(GetBetHistoryDto, { gameId: 'v_unknown' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-numeric cursor', async () => {
    const dto = plainToInstance(GetBetHistoryDto, { cursor: 'abc' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
