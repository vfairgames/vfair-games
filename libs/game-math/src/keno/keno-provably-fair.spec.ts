import { describe, expect, it } from 'vitest';

import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '../provably-fair/provably-fair';
import { drawKenoNumbers, verifyKenoDraw } from './keno-provably-fair';
import { KENO_DRAW_COUNT, KENO_POOL_SIZE } from './keno-constants';

describe('drawKenoNumbers', () => {
  it('draws 10 unique numbers between 1 and 40', () => {
    const drawn = drawKenoNumbers('a'.repeat(64), 'client-seed', 1);
    expect(drawn).toHaveLength(KENO_DRAW_COUNT);
    expect(new Set(drawn).size).toBe(KENO_DRAW_COUNT);
    expect(Math.min(...drawn)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...drawn)).toBeLessThanOrEqual(KENO_POOL_SIZE);
    expect(drawn).toEqual([...drawn].sort((left, right) => left - right));
  });

  it('is deterministic for the same fairness inputs', () => {
    const first = drawKenoNumbers('b'.repeat(64), 'seed', 42);
    const second = drawKenoNumbers('b'.repeat(64), 'seed', 42);
    expect(first).toEqual(second);
  });

  it('verifies a valid draw', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = 7;
    const drawnNumbers = drawKenoNumbers(serverSeed, clientSeed, nonce);

    const result = verifyKenoDraw({
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      clientSeed,
      nonce,
      drawnNumbers,
    });

    expect(result.verified).toBe(true);
    expect(result.expectedDrawnNumbers).toEqual(drawnNumbers);
  });

  it('rejects a tampered draw', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = 3;
    const drawnNumbers = drawKenoNumbers(serverSeed, clientSeed, nonce);
    const tamperedDraw = [...drawnNumbers];
    tamperedDraw[0] = tamperedDraw[0] === 1 ? 2 : 1;

    const result = verifyKenoDraw({
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      clientSeed,
      nonce,
      drawnNumbers: tamperedDraw,
    });

    expect(result.verified).toBe(false);
    expect(result.drawMatches).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
  });

  it('rejects a draw when the server seed hash does not match', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = 5;
    const drawnNumbers = drawKenoNumbers(serverSeed, clientSeed, nonce);

    const result = verifyKenoDraw({
      serverSeed,
      serverSeedHash: hashServerSeed(generateServerSeed()),
      clientSeed,
      nonce,
      drawnNumbers,
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(false);
  });
});
