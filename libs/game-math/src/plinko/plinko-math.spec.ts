import { describe, expect, it } from 'vitest';

import {
  generateClientSeed,
  hashServerSeed,
} from '../provably-fair/provably-fair';
import {
  MAX_PLINKO_ROWS,
  MIN_PLINKO_ROWS,
  PLINKO_RISKS,
  type PlinkoRisk,
} from './plinko-constants';
import {
  calculatePlinkoExpectedReturn,
  createPlinkoOdds,
  getPlinkoBucketProbabilities,
} from './plinko-math';
import { getBasePlinkoMultipliers } from './plinko-multipliers';
import {
  rollPlinko,
  verifyPlinkoRoll,
  type PlinkoRollVerificationInput,
} from './plinko-provably-fair';

const serverSeed =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const clientSeed = 'client-seed';
const nonce = 7;

const EXPECTED_RETURN: Record<number, Record<PlinkoRisk, number>> = {
  8: {
    easy: 0.98984375,
    medium: 0.9890625,
    hard: 0.990625,
    expert: 0.98984375,
  },
  9: {
    easy: 0.98984375,
    medium: 0.99140625,
    hard: 0.990625,
    expert: 0.990625,
  },
  10: {
    easy: 0.9900390625,
    medium: 0.9890625,
    hard: 0.990625,
    expert: 0.989453125,
  },
  11: {
    easy: 0.9900390625,
    medium: 0.990234375,
    hard: 0.9916015625,
    expert: 0.98994140625,
  },
  12: {
    easy: 0.989794921875,
    medium: 0.989892578125,
    hard: 0.991162109375,
    expert: 0.9904296875,
  },
  13: {
    easy: 0.989990234375,
    medium: 0.98994140625,
    hard: 0.990869140625,
    expert: 0.9871337890625,
  },
  14: {
    easy: 0.99000244140625,
    medium: 0.98994140625,
    hard: 0.98978271484375,
    expert: 0.98162841796875,
  },
  15: {
    easy: 0.990008544921875,
    medium: 0.989984130859375,
    hard: 0.990264892578125,
    expert: 0.990087890625,
  },
  16: {
    easy: 0.9899871826171875,
    medium: 0.9898834228515625,
    hard: 0.989764404296875,
    expert: 0.9899627685546875,
  },
};

const everyRowsRisk = (): Array<[number, PlinkoRisk]> => {
  const configs: Array<[number, PlinkoRisk]> = [];

  for (let rows = MIN_PLINKO_ROWS; rows <= MAX_PLINKO_ROWS; rows += 1) {
    for (const risk of PLINKO_RISKS) {
      configs.push([rows, risk]);
    }
  }

  return configs;
};

const buildValidVerificationInput = (): PlinkoRollVerificationInput => {
  const { path, bucketIndex } = rollPlinko(serverSeed, clientSeed, nonce, 16);

  return {
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed,
    nonce,
    rows: 16,
    path,
    bucketIndex,
  };
};

describe('plinko math', () => {
  it('returns Plinko multipliers for 16×medium', () => {
    expect(createPlinkoOdds().getMultipliers(16, 'medium')).toEqual([
      110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110,
    ]);
  });

  it('returns Plinko multipliers for 8×medium', () => {
    expect(createPlinkoOdds().getMultipliers(8, 'medium')).toEqual([
      13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13,
    ]);
  });

  it('returns Plinko multipliers for odd-row 9×easy', () => {
    expect(createPlinkoOdds().getMultipliers(9, 'easy')).toEqual([
      5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6,
    ]);
  });

  it('returns Plinko multipliers for 16×expert', () => {
    expect(createPlinkoOdds().getMultipliers(16, 'expert')).toEqual([
      10000, 216, 26, 7, 2.5, 1.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1.1, 2.5, 7, 26,
      216, 10000,
    ]);
  });

  it('returns limits for rows and risk', () => {
    expect(createPlinkoOdds().getLimits()).toEqual({
      rows: { min: MIN_PLINKO_ROWS, max: MAX_PLINKO_ROWS },
      risk: PLINKO_RISKS,
    });
  });

  it('resolves a single bucket multiplier', () => {
    const odds = createPlinkoOdds();

    expect(odds.getMultiplier(16, 'medium', 0)).toBe(110);
    expect(odds.getMultiplier(16, 'medium', 8)).toBe(0.3);
    expect(odds.getMultiplier(16, 'medium', 16)).toBe(110);
  });

  it('rejects out-of-range bucket indexes', () => {
    const odds = createPlinkoOdds();

    expect(() => odds.getMultiplier(16, 'medium', -1)).toThrow(RangeError);
    expect(() => odds.getMultiplier(16, 'medium', 17)).toThrow(RangeError);
    expect(() => odds.getMultiplier(16, 'medium', 1.5)).toThrow(RangeError);
  });

  it('rejects invalid rows and risk on getMultipliers', () => {
    const odds = createPlinkoOdds();

    expect(() => odds.getMultipliers(7, 'medium')).toThrow(RangeError);
    expect(() => odds.getMultipliers(17, 'medium')).toThrow(RangeError);
    expect(() => odds.getMultipliers(16, 'insane' as PlinkoRisk)).toThrow(
      RangeError,
    );
  });

  it('keeps binomial probabilities exact for 8 rows', () => {
    expect(getPlinkoBucketProbabilities(8)).toEqual(
      [1, 8, 28, 56, 70, 56, 28, 8, 1].map((count) => count / 256),
    );
  });

  it('keeps binomial probabilities summing to 1 for every row count', () => {
    for (let rows = MIN_PLINKO_ROWS; rows <= MAX_PLINKO_ROWS; rows += 1) {
      const probabilities = getPlinkoBucketProbabilities(rows);
      const sum = probabilities.reduce((total, value) => total + value, 0);

      expect(probabilities).toHaveLength(rows + 1);
      expect(sum).toBeCloseTo(1, 12);
    }
  });

  it('expands every Plinko table to a symmetric rows+1 bucket list', () => {
    for (const [rows, risk] of everyRowsRisk()) {
      const multipliers = getBasePlinkoMultipliers(rows, risk);

      expect(multipliers).toHaveLength(rows + 1);
      expect(multipliers).toEqual([...multipliers].reverse());
    }
  });

  it('keeps EV locked for every rows×risk table', () => {
    for (const [rows, risk] of everyRowsRisk()) {
      const multipliers = getBasePlinkoMultipliers(rows, risk);
      const ev = calculatePlinkoExpectedReturn(multipliers, rows);

      expect(ev).toBeCloseTo(EXPECTED_RETURN[rows][risk], 12);
    }
  });

  it('validates rows and risk', () => {
    const odds = createPlinkoOdds();

    expect(odds.validate({ rows: 7, risk: 'medium' }).rows).toBeTruthy();
    expect(odds.validate({ rows: 16, risk: 'insane' }).risk).toBeTruthy();
    expect(odds.validate({ rows: 16, risk: 'medium' })).toEqual({});
  });
});

describe('plinko provably fair', () => {
  it('returns a known path for the fixture seeds', () => {
    expect(rollPlinko(serverSeed, clientSeed, nonce, 16)).toEqual({
      path: [
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        true,
        true,
        false,
        true,
      ],
      bucketIndex: 8,
    });
  });

  it('returns a known path for 8 rows with the same fixture', () => {
    expect(rollPlinko(serverSeed, clientSeed, nonce, 8)).toEqual({
      path: [true, false, false, true, false, true, false, true],
      bucketIndex: 4,
    });
  });

  it('is deterministic and sets bucketIndex from right steps', () => {
    const first = rollPlinko(serverSeed, clientSeed, nonce, 16);
    const second = rollPlinko(serverSeed, clientSeed, nonce, 16);

    expect(first).toEqual(second);
    expect(first.path).toHaveLength(16);
    expect(first.bucketIndex).toBe(
      first.path.reduce((total, goRight) => total + (goRight ? 1 : 0), 0),
    );
  });

  it('changes outcome when nonce changes', () => {
    expect(rollPlinko(serverSeed, clientSeed, 0, 12)).not.toEqual(
      rollPlinko(serverSeed, clientSeed, 1, 12),
    );
  });

  it('changes outcome when client seed changes', () => {
    expect(rollPlinko(serverSeed, clientSeed, nonce, 12)).not.toEqual(
      rollPlinko(serverSeed, 'other-client', nonce, 12),
    );
  });

  it('rejects invalid server seeds', () => {
    expect(() => rollPlinko('server-seed', clientSeed, nonce, 16)).toThrow(
      'Invalid serverSeed',
    );
    expect(() => rollPlinko('g'.repeat(64), clientSeed, nonce, 16)).toThrow(
      'Invalid serverSeed',
    );
  });

  it('rejects invalid row counts', () => {
    expect(() => rollPlinko(serverSeed, clientSeed, nonce, 7)).toThrow(
      RangeError,
    );
    expect(() => rollPlinko(serverSeed, clientSeed, nonce, 17)).toThrow(
      RangeError,
    );
    expect(() => rollPlinko(serverSeed, clientSeed, nonce, 8.5)).toThrow(
      RangeError,
    );
  });

  it('verifies an honest stored roll', () => {
    expect(verifyPlinkoRoll(buildValidVerificationInput())).toEqual({
      serverSeedMatchesHash: true,
      pathMatches: true,
      bucketMatches: true,
      verified: true,
      expected: {
        path: [
          true,
          false,
          false,
          true,
          false,
          true,
          false,
          true,
          false,
          false,
          true,
          false,
          true,
          true,
          false,
          true,
        ],
        bucketIndex: 8,
      },
    });
  });

  it('fails when only the server seed hash is wrong', () => {
    const result = verifyPlinkoRoll({
      ...buildValidVerificationInput(),
      serverSeedHash: hashServerSeed('a'.repeat(64)),
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(false);
    expect(result.pathMatches).toBe(true);
    expect(result.bucketMatches).toBe(true);
  });

  it('fails when only the path is wrong', () => {
    const input = buildValidVerificationInput();
    const result = verifyPlinkoRoll({
      ...input,
      path: input.path.map((step, index) => (index === 0 ? !step : step)),
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
    expect(result.pathMatches).toBe(false);
  });

  it('fails when only the bucket index is wrong', () => {
    const result = verifyPlinkoRoll({
      ...buildValidVerificationInput(),
      bucketIndex: 0,
    });

    expect(result.verified).toBe(false);
    expect(result.serverSeedMatchesHash).toBe(true);
    expect(result.pathMatches).toBe(true);
    expect(result.bucketMatches).toBe(false);
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
    ['rows', { rows: 12 }],
    ['path', { path: Array.from({ length: 16 }, () => false) }],
    ['bucketIndex', { bucketIndex: 0 }],
  ])('fails verification when %s is tampered', (_field, override) => {
    expect(
      verifyPlinkoRoll({
        ...buildValidVerificationInput(),
        ...override,
      } as PlinkoRollVerificationInput).verified,
    ).toBe(false);
  });

  it('spreads bucket indexes across nonces', () => {
    const buckets = new Set<number>();

    for (let rollNonce = 0; rollNonce < 200; rollNonce += 1) {
      buckets.add(
        rollPlinko(serverSeed, generateClientSeed(), rollNonce, 16).bucketIndex,
      );
    }

    expect(buckets.size).toBeGreaterThan(8);
  });
});
