import type { KenoRisk } from './keno-constants';
import { KENO_REFERENCE_PAYTABLES } from './keno-reference-paytables';

type KenoPaytable = readonly number[];

export const getBaseKenoMultipliers = (
  pickCount: number,
  risk: KenoRisk,
): KenoPaytable => {
  const table = KENO_REFERENCE_PAYTABLES[pickCount]?.[risk];

  if (!table) {
    throw new RangeError(`Unsupported Keno pick count: ${pickCount}`);
  }

  return table;
};
