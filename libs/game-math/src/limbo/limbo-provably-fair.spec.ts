import { describe, expect, it } from 'vitest';

import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '../provably-fair/provably-fair';
import { MAX_CRASH_MULTIPLIER } from './limbo-constants';
import {
  rollLimbo,
  rollLimboFromHash,
  verifyLimboRoll,
  type LimboRollVerificationInput,
} from './limbo-provably-fair';

const serverSeed =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const clientSeed = 'client-seed';
const nonce = 7;
const rtp = 0.98;
const GOLDEN_HASH =
  'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';

const buildValidVerificationInput = (): LimboRollVerificationInput => {
  const rolledMultiplier = rollLimbo(serverSeed, clientSeed, nonce, rtp);

  return {
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed,
    nonce,
    rolledMultiplier,
    rtp,
  };
};

describe('limbo provably fair rng', () => {
  it('maps hash output to an exact crash multiplier at the given rtp', () => {
    expect(rollLimboFromHash(GOLDEN_HASH, 0.98)).toBe(1.01);
    expect(rollLimboFromHash(GOLDEN_HASH, 0.99)).toBe(1.02);
    expect(rollLimboFromHash(GOLDEN_HASH, 0.9)).toBe(1);
  });

  it('clamps a near-zero float to the max crash multiplier', () => {
    const zeroPrefixHash = `00000000${GOLDEN_HASH.slice(8)}`;

    expect(rollLimboFromHash(zeroPrefixHash, rtp)).toBe(MAX_CRASH_MULTIPLIER);
  });

  it('clamps a near-one float to the minimum crash multiplier', () => {
    const nearOneHash = `ffffffff${GOLDEN_HASH.slice(8)}`;

    expect(rollLimboFromHash(nearOneHash, rtp)).toBe(1);
  });

  it('always returns the same roll for the same seeds, nonce, and rtp', () => {
    expect(rollLimbo(serverSeed, clientSeed, nonce, rtp)).toBe(
      rollLimbo(serverSeed, clientSeed, nonce, rtp),
    );
  });

  it('returns a known crash multiplier for the fixture seeds', () => {
    expect(rollLimbo(serverSeed, clientSeed, nonce, rtp)).toBe(1.54);
  });

  it('changes the roll when the nonce changes', () => {
    expect(rollLimbo(serverSeed, clientSeed, nonce, rtp)).not.toBe(
      rollLimbo(serverSeed, clientSeed, nonce + 1, rtp),
    );
  });

  it('changes the roll when rtp changes', () => {
    expect(rollLimbo(serverSeed, clientSeed, nonce, 0.98)).not.toBe(
      rollLimbo(serverSeed, clientSeed, nonce, 0.99),
    );
  });

  it('rejects invalid hash input', () => {
    expect(() => rollLimboFromHash('abc', rtp)).toThrow(RangeError);
    expect(() => rollLimboFromHash('aa', rtp)).toThrow(RangeError);
  });

  it('rejects invalid server seeds', () => {
    expect(() => rollLimbo('server-seed', clientSeed, nonce, rtp)).toThrow(
      'Invalid serverSeed',
    );
    expect(() => rollLimbo('g'.repeat(64), clientSeed, nonce, rtp)).toThrow(
      'Invalid serverSeed',
    );
  });

  it('verifies an honest stored roll', () => {
    expect(verifyLimboRoll(buildValidVerificationInput())).toEqual({
      serverSeedMatchesHash: true,
      rolledMultiplierMatches: true,
      verified: true,
      expectedRolledMultiplier: 1.54,
    });
  });

  it('fails when only the server seed hash is wrong', () => {
    const result = verifyLimboRoll({
      ...buildValidVerificationInput(),
      serverSeedHash: hashServerSeed('a'.repeat(64)),
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(false);
    expect(result.rolledMultiplierMatches).toBe(true);
  });

  it('fails when only the rolled multiplier is wrong', () => {
    const result = verifyLimboRoll({
      ...buildValidVerificationInput(),
      rolledMultiplier: 99.99,
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
    expect(result.rolledMultiplierMatches).toBe(false);
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
    ['rolledMultiplier', { rolledMultiplier: 99.99 }],
    ['rtp', { rtp: 0.99 }],
  ])('fails verification when %s is tampered', (_field, override) => {
    expect(
      verifyLimboRoll({
        ...buildValidVerificationInput(),
        ...override,
      } as LimboRollVerificationInput).verified,
    ).toBe(false);
  });

  it('spreads rolls across a wide range over many nonces', () => {
    const rollCount = 1000;
    const seedPairCount = 3;
    const seedPairs = Array.from({ length: seedPairCount }, () => ({
      serverSeed: generateServerSeed(),
      clientSeed: generateClientSeed(),
    }));

    for (const {
      serverSeed: testServerSeed,
      clientSeed: testClientSeed,
    } of seedPairs) {
      const rolls = Array.from({ length: rollCount }, (_, rollNonce) =>
        rollLimbo(testServerSeed, testClientSeed, rollNonce, rtp),
      );

      for (const rolledMultiplier of rolls) {
        expect(rolledMultiplier).toBeGreaterThanOrEqual(1);
        expect(rolledMultiplier).toBeLessThanOrEqual(MAX_CRASH_MULTIPLIER);
        expect(rolledMultiplier).toBe(Math.round(rolledMultiplier * 100) / 100);
      }

      const min = Math.min(...rolls);
      const max = Math.max(...rolls);

      expect(min).toBeLessThan(2);
      expect(max).toBeGreaterThan(10);
    }
  });

  it('targets rtp/T as the empirical win rate for common targets', () => {
    const rollCount = 20_000;
    const seedPairs = Array.from({ length: 2 }, () => ({
      serverSeed: generateServerSeed(),
      clientSeed: generateClientSeed(),
    }));
    const targets = [2, 10] as const;

    for (const target of targets) {
      const expectedRate = rtp / target;
      let wins = 0;
      let total = 0;

      for (const {
        serverSeed: testServerSeed,
        clientSeed: testClientSeed,
      } of seedPairs) {
        for (let rollNonce = 0; rollNonce < rollCount; rollNonce += 1) {
          const rolled = rollLimbo(
            testServerSeed,
            testClientSeed,
            rollNonce,
            rtp,
          );
          total += 1;

          if (rolled >= target) {
            wins += 1;
          }
        }
      }

      const observedRate = wins / total;
      expect(observedRate).toBeGreaterThan(expectedRate * 0.85);
      expect(observedRate).toBeLessThan(expectedRate * 1.15);
    }
  });
});
