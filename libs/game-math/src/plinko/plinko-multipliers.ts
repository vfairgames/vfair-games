import type { PlinkoRisk } from './plinko-constants';
import { MAX_PLINKO_ROWS, MIN_PLINKO_ROWS } from './plinko-constants';

const expandHalf = (rows: number, half: readonly number[]): number[] => {
  const bucketCount = rows + 1;
  const expectedHalfLength =
    bucketCount % 2 === 1 ? Math.floor(bucketCount / 2) + 1 : bucketCount / 2;

  if (half.length !== expectedHalfLength) {
    throw new Error(
      `Invalid half table length for ${rows} rows: expected ${expectedHalfLength}, got ${half.length}`,
    );
  }

  if (bucketCount % 2 === 1) {
    const left = half.slice(0, -1);
    return [...left, ...[...half].reverse()];
  }

  return [...half, ...[...half].reverse()];
};

type HalfByRisk = Record<PlinkoRisk, readonly number[]>;

const HALF_TABLES: Record<number, HalfByRisk> = {
  8: {
    easy: [5.6, 2.1, 1.1, 1, 0.5],
    medium: [13, 3, 1.3, 0.7, 0.4],
    hard: [29, 4, 1.5, 0.3, 0.2],
    expert: [50, 4.6, 1.1, 0.1, 0.1],
  },
  9: {
    easy: [5.6, 2, 1.6, 1, 0.7],
    medium: [18, 4, 1.7, 0.9, 0.5],
    hard: [43, 7, 2, 0.6, 0.2],
    expert: [100, 7.8, 1.5, 0.2, 0.1],
  },
  10: {
    easy: [8.9, 3, 1.4, 1.1, 1, 0.5],
    medium: [22, 5, 2, 1.4, 0.6, 0.4],
    hard: [76, 10, 3, 0.9, 0.3, 0.2],
    expert: [201, 11, 2, 0.6, 0.1, 0.1],
  },
  11: {
    easy: [8.4, 3, 1.9, 1.3, 1, 0.7],
    medium: [24, 6, 3, 1.8, 0.7, 0.5],
    hard: [120, 14, 5.2, 1.4, 0.4, 0.2],
    expert: [324, 16, 4, 1.1, 0.2, 0.1],
  },
  12: {
    easy: [10, 3, 1.6, 1.4, 1.1, 1, 0.5],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3],
    hard: [170, 24, 8.1, 2, 0.7, 0.2, 0.2],
    expert: [619, 30, 6, 1.5, 0.4, 0.1, 0.1],
  },
  13: {
    easy: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7],
    medium: [43, 13, 6, 3, 1.3, 0.7, 0.4],
    hard: [260, 37, 11, 4, 1, 0.2, 0.2],
    expert: [1000, 52, 10, 3, 0.6, 0.1, 0.1],
  },
  14: {
    easy: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5],
    medium: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2],
    hard: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2],
    expert: [2300, 80, 16, 3, 1.2, 0.2, 0.1, 0.1],
  },
  15: {
    easy: [15, 8, 3, 2, 1.5, 1.1, 1, 0.7],
    medium: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3],
    hard: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2],
    expert: [5000, 125, 23, 6, 1.8, 0.2, 0.1, 0.1],
  },
  16: {
    easy: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3],
    hard: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2],
    expert: [10000, 216, 26, 7, 2.5, 1.1, 0.1, 0.1, 0.1],
  },
};

export const getBasePlinkoMultipliers = (
  rows: number,
  risk: PlinkoRisk,
): number[] => {
  if (
    !Number.isInteger(rows) ||
    rows < MIN_PLINKO_ROWS ||
    rows > MAX_PLINKO_ROWS
  ) {
    throw new RangeError(
      `Rows must be an integer between ${MIN_PLINKO_ROWS} and ${MAX_PLINKO_ROWS}`,
    );
  }

  const half = HALF_TABLES[rows]?.[risk];

  if (!half) {
    throw new Error(`Missing Plinko multiplier table for ${rows}×${risk}`);
  }

  return expandHalf(rows, half);
};
