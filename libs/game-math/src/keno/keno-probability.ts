import { KENO_DRAW_COUNT, KENO_POOL_SIZE } from './keno-constants';

const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) {
    return 0;
  }

  let result = 1;

  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - k + index)) / index;
  }

  return result;
};

export const getKenoHitProbability = (
  pickCount: number,
  hitCount: number,
): number => {
  if (
    !Number.isInteger(pickCount) ||
    !Number.isInteger(hitCount) ||
    hitCount < 0 ||
    hitCount > pickCount ||
    hitCount > KENO_DRAW_COUNT
  ) {
    return 0;
  }

  const numerator =
    choose(pickCount, hitCount) *
    choose(KENO_POOL_SIZE - pickCount, KENO_DRAW_COUNT - hitCount);
  const denominator = choose(KENO_POOL_SIZE, KENO_DRAW_COUNT);

  return numerator / denominator;
};

export const calculateKenoExpectedReturn = (
  pickCount: number,
  multipliers: readonly number[],
): number => {
  let expected = 0;

  for (let hit = 0; hit <= pickCount; hit += 1) {
    expected += getKenoHitProbability(pickCount, hit) * (multipliers[hit] ?? 0);
  }

  return expected;
};
