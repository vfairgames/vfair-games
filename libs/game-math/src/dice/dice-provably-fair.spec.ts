import { describe, expect, it } from 'vitest';

import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '../provably-fair/provably-fair';
import {
  rollDice,
  rollDiceFromHash,
  verifyDiceRoll,
  type DiceRollVerificationInput,
} from './dice-provably-fair';

const serverSeed =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const clientSeed = 'client-seed';
const nonce = 7;

const buildValidVerificationInput = (): DiceRollVerificationInput => {
  const rolledValue = rollDice(serverSeed, clientSeed, nonce);

  return {
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed,
    nonce,
    rolledValue,
  };
};

describe('dice provably fair rng', () => {
  it('maps hash output to a two decimal dice roll', () => {
    expect(
      rollDiceFromHash(
        'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
      ),
    ).toBe(96.77);
  });

  it('always returns the same roll for the same seeds and nonce', () => {
    expect(rollDice(serverSeed, clientSeed, nonce)).toBe(
      rollDice(serverSeed, clientSeed, nonce),
    );
  });

  it('changes the roll when the nonce changes', () => {
    expect(rollDice(serverSeed, clientSeed, nonce)).not.toBe(
      rollDice(serverSeed, clientSeed, nonce + 1),
    );
  });

  it('rejects invalid hash input', () => {
    expect(() => rollDiceFromHash('abc')).toThrow(RangeError);
    expect(() => rollDiceFromHash('aa')).toThrow(RangeError);
  });

  it('rejects invalid server seeds', () => {
    expect(() => rollDice('server-seed', clientSeed, nonce)).toThrow(
      'Invalid serverSeed',
    );
    expect(() => rollDice('g'.repeat(64), clientSeed, nonce)).toThrow(
      'Invalid serverSeed',
    );
  });

  it('verifies an honest stored roll', () => {
    expect(verifyDiceRoll(buildValidVerificationInput())).toEqual({
      serverSeedMatchesHash: true,
      rolledValueMatches: true,
      verified: true,
      expectedRolledValue: 63.61,
    });
  });

  it('fails when only the server seed hash is wrong', () => {
    const result = verifyDiceRoll({
      ...buildValidVerificationInput(),
      serverSeedHash: hashServerSeed('a'.repeat(64)),
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(false);
    expect(result.rolledValueMatches).toBe(true);
  });

  it('fails when only the rolled value is wrong', () => {
    const result = verifyDiceRoll({
      ...buildValidVerificationInput(),
      rolledValue: 99.99,
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
    expect(result.rolledValueMatches).toBe(false);
  });

  /*
   * Smoke test that rolls are spread across [0, 100), not clustered in one band.
   * Runs with three seed pairs, rolls 1000 nonces each, splits results into 10 decile
   * buckets (~100 hits each if uniform), and asserts each bucket lands between 50 and
   * 150 hits and min/max reach both ends.
   */
  it('spreads rolls across the full range over many nonces', () => {
    const rollCount = 1000;
    const bucketCount = 10;
    const minHitsPerBucket = 50;
    const maxHitsPerBucket = 150;
    const seedPairCount = 3;
    const seedPairs = Array.from({ length: seedPairCount }, () => ({
      serverSeed: generateServerSeed(),
      clientSeed: generateClientSeed(),
    }));

    for (const {
      serverSeed: testServerSeed,
      clientSeed: testClientSeed,
    } of seedPairs) {
      const buckets = Array.from({ length: bucketCount }, () => 0);
      const rolls = Array.from({ length: rollCount }, (_, rollNonce) =>
        rollDice(testServerSeed, testClientSeed, rollNonce),
      );

      for (const rolledValue of rolls) {
        expect(rolledValue).toBeGreaterThanOrEqual(0);
        expect(rolledValue).toBeLessThan(100);

        const bucketIndex = Math.min(
          bucketCount - 1,
          Math.floor(rolledValue / (100 / bucketCount)),
        );
        buckets[bucketIndex] += 1;
      }

      expect(Math.min(...rolls)).toBeLessThan(10);
      expect(Math.max(...rolls)).toBeGreaterThan(90);

      for (const hits of buckets) {
        expect(hits).toBeGreaterThanOrEqual(minHitsPerBucket);
        expect(hits).toBeLessThanOrEqual(maxHitsPerBucket);
      }
    }
  });

  it.each([
    [
      'serverSeed',
      {
        serverSeed:
          'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      },
    ],
    ['serverSeedHash', { serverSeedHash: hashServerSeed('d'.repeat(64)) }],
    ['clientSeed', { clientSeed: 'tampered-client-seed' }],
    ['nonce', { nonce: nonce + 1 }],
    ['rolledValue', { rolledValue: 99.99 }],
  ])('fails verification when %s is tampered', (_field, override) => {
    expect(
      verifyDiceRoll({
        ...buildValidVerificationInput(),
        ...override,
      } as DiceRollVerificationInput).verified,
    ).toBe(false);
  });
});
