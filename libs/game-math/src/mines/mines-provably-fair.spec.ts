import { describe, expect, it } from 'vitest';

import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '../provably-fair/provably-fair';
import { MINES_GRID_SIZE } from './mines-constants';
import { generateMineLayout, verifyMineLayout } from './mines-provably-fair';

describe('generateMineLayout', () => {
  it('returns the requested number of unique sorted tile indices', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const layout = generateMineLayout(serverSeed, clientSeed, 0, 7);

    expect(layout).toHaveLength(7);
    expect(new Set(layout).size).toBe(7);
    expect(layout).toEqual([...layout].sort((a, b) => a - b));
    expect(layout.every((tile) => tile >= 0 && tile < MINES_GRID_SIZE)).toBe(
      true,
    );
  });

  it('is deterministic for the same seeds and nonce', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const first = generateMineLayout(serverSeed, clientSeed, 4, 5);
    const second = generateMineLayout(serverSeed, clientSeed, 4, 5);

    expect(first).toEqual(second);
  });

  it('changes when nonce changes', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const first = generateMineLayout(serverSeed, clientSeed, 0, 5);
    const second = generateMineLayout(serverSeed, clientSeed, 1, 5);

    expect(first).not.toEqual(second);
  });

  it('supports edge mine counts', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();

    expect(generateMineLayout(serverSeed, clientSeed, 0, 1)).toHaveLength(1);
    expect(generateMineLayout(serverSeed, clientSeed, 0, 24)).toHaveLength(24);
  });

  it('rejects invalid mine counts', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();

    expect(() => generateMineLayout(serverSeed, clientSeed, 0, 0)).toThrow(
      RangeError,
    );
    expect(() => generateMineLayout(serverSeed, clientSeed, 0, 25)).toThrow(
      RangeError,
    );
  });

  it('rejects invalid server seeds', () => {
    const clientSeed = generateClientSeed();

    expect(() => generateMineLayout('abc', clientSeed, 0, 3)).toThrow(
      'Invalid serverSeed',
    );
    expect(() => generateMineLayout('g'.repeat(64), clientSeed, 0, 3)).toThrow(
      'Invalid serverSeed',
    );
  });

  it('supports custom grid sizes', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const gridSize = 9;
    const mineCount = 2;
    const layout = generateMineLayout(
      serverSeed,
      clientSeed,
      0,
      mineCount,
      gridSize,
    );

    expect(layout).toHaveLength(mineCount);
    expect(new Set(layout).size).toBe(mineCount);
    expect(layout.every((tile) => tile >= 0 && tile < gridSize)).toBe(true);
  });

  it('rejects mine counts that fill a custom grid', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();

    expect(() => generateMineLayout(serverSeed, clientSeed, 0, 9, 9)).toThrow(
      RangeError,
    );
  });

  it('is deterministic for custom grid sizes', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const gridSize = 16;

    expect(generateMineLayout(serverSeed, clientSeed, 3, 4, gridSize)).toEqual(
      generateMineLayout(serverSeed, clientSeed, 3, 4, gridSize),
    );
  });
});

describe('verifyMineLayout', () => {
  it('verifies a matching layout', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = 2;
    const mineCount = 4;
    const mineLayout = generateMineLayout(
      serverSeed,
      clientSeed,
      nonce,
      mineCount,
    );

    const result = verifyMineLayout({
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      clientSeed,
      nonce,
      mineCount,
      mineLayout,
    });

    expect(result.verified).toBe(true);
    expect(result.layoutMatches).toBe(true);
    expect(result.serverSeedMatchesHash).toBe(true);
    expect(result.expectedMineLayout).toEqual(mineLayout);
  });

  it('fails when layout does not match', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const mineLayout = generateMineLayout(serverSeed, clientSeed, 0, 3);

    const result = verifyMineLayout({
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      clientSeed,
      nonce: 0,
      mineCount: 3,
      mineLayout: mineLayout.map((tile) => (tile + 1) % MINES_GRID_SIZE),
    });

    expect(result.verified).toBe(false);
    expect(result.layoutMatches).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
  });

  it('fails when server seed hash does not match', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const mineCount = 3;
    const mineLayout = generateMineLayout(serverSeed, clientSeed, 0, mineCount);

    const result = verifyMineLayout({
      serverSeed,
      serverSeedHash: hashServerSeed('a'.repeat(64)),
      clientSeed,
      nonce: 0,
      mineCount,
      mineLayout,
    });

    expect(result.verified).toBe(false);
    expect(result.layoutMatches).toBe(true);
    expect(result.serverSeedMatchesHash).toBe(false);
  });

  it('verifies layouts for custom grid sizes', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const gridSize = 9;
    const mineCount = 2;
    const mineLayout = generateMineLayout(
      serverSeed,
      clientSeed,
      1,
      mineCount,
      gridSize,
    );

    const result = verifyMineLayout({
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      clientSeed,
      nonce: 1,
      mineCount,
      mineLayout,
      gridSize,
    });

    expect(result.verified).toBe(true);
    expect(result.layoutMatches).toBe(true);
    expect(result.expectedMineLayout).toEqual(mineLayout);
  });
});
