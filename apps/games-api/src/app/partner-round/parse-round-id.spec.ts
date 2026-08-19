import { BadRequestException } from '@nestjs/common';
import { parseRoundId } from './parse-round-id';

describe('parseRoundId', () => {
  it('parses a positive integer string', () => {
    expect(parseRoundId('42')).toBe(BigInt('42'));
    expect(parseRoundId('0007')).toBe(BigInt('7'));
  });

  it('rejects non-numeric values', () => {
    expect(() => parseRoundId('abc')).toThrow(BadRequestException);
    expect(() => parseRoundId('12.5')).toThrow(BadRequestException);
    expect(() => parseRoundId('')).toThrow(BadRequestException);
  });

  it('rejects zero and negative values', () => {
    for (const value of ['0', '-1']) {
      try {
        parseRoundId(value);
        throw new Error(`expected parseRoundId("${value}") to throw`);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual({
          err_code: 'invalid_round_id',
          message: 'Round id must be a positive integer',
        });
      }
    }
  });
});
