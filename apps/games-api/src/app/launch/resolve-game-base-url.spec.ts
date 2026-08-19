import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
} from '@vfair/game-contracts';
import { resolveGameBaseUrl } from './resolve-game-base-url';

describe('resolveGameBaseUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to localhost in non-production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DICE_GAME_BASE_URL;
    delete process.env.MINES_GAME_BASE_URL;
    delete process.env.LIMBO_GAME_BASE_URL;
    delete process.env.PLINKO_GAME_BASE_URL;
    delete process.env.KENO_GAME_BASE_URL;

    expect(resolveGameBaseUrl(DICE_GAME_ID)).toBe('http://localhost:4200');
    expect(resolveGameBaseUrl(MINES_GAME_ID)).toBe('http://localhost:4201');
    expect(resolveGameBaseUrl(LIMBO_GAME_ID)).toBe('http://localhost:4202');
    expect(resolveGameBaseUrl(PLINKO_GAME_ID)).toBe('http://localhost:4203');
    expect(resolveGameBaseUrl(KENO_GAME_ID)).toBe('http://localhost:4204');
  });

  it('requires game base URLs in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DICE_GAME_BASE_URL;

    expect(() => resolveGameBaseUrl(DICE_GAME_ID)).toThrow(
      'DICE_GAME_BASE_URL is required when NODE_ENV is production',
    );
  });

  it('reads env overrides', () => {
    process.env.NODE_ENV = 'production';
    process.env.DICE_GAME_BASE_URL = 'https://dice.example.com';
    process.env.MINES_GAME_BASE_URL = 'https://mines.example.com';
    process.env.LIMBO_GAME_BASE_URL = 'https://limbo.example.com';
    process.env.PLINKO_GAME_BASE_URL = 'https://plinko.example.com';
    process.env.KENO_GAME_BASE_URL = 'https://keno.example.com';

    expect(resolveGameBaseUrl(DICE_GAME_ID)).toBe('https://dice.example.com');
    expect(resolveGameBaseUrl(MINES_GAME_ID)).toBe('https://mines.example.com');
    expect(resolveGameBaseUrl(LIMBO_GAME_ID)).toBe('https://limbo.example.com');
    expect(resolveGameBaseUrl(PLINKO_GAME_ID)).toBe(
      'https://plinko.example.com',
    );
    expect(resolveGameBaseUrl(KENO_GAME_ID)).toBe('https://keno.example.com');
  });
});
