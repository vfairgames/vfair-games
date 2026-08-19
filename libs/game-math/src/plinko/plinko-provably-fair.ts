import {
  assertValidServerSeed,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  hashServerSeed,
  hexToBytes,
  type FairnessState,
} from '../provably-fair/provably-fair';
import {
  isPlinkoRows,
  MAX_PLINKO_ROWS,
  MIN_PLINKO_ROWS,
} from './plinko-constants';

export type PlinkoRollResult = {
  path: boolean[];
  bucketIndex: number;
};

export type PlinkoRollVerificationInput = FairnessState & {
  serverSeed: string;
  rows: number;
  path: readonly boolean[];
  bucketIndex: number;
};

export type PlinkoRollVerificationResult = {
  serverSeedMatchesHash: boolean;
  pathMatches: boolean;
  bucketMatches: boolean;
  verified: boolean;
  expected: PlinkoRollResult;
};

const hashToFloat = (hashHex: string): number => {
  const bytes = hexToBytes(hashHex);

  if (bytes.length < 4) {
    throw new RangeError('Hash must contain at least 4 bytes');
  }

  const integer =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;

  return integer / 2 ** 32;
};

const assertRows = (rows: number): void => {
  if (!isPlinkoRows(rows)) {
    throw new RangeError(
      `Rows must be an integer between ${MIN_PLINKO_ROWS} and ${MAX_PLINKO_ROWS}`,
    );
  }
};

export const rollPlinko = (
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number,
): PlinkoRollResult => {
  assertValidServerSeed(serverSeed);
  assertRows(rows);

  const path: boolean[] = [];
  let bucketIndex = 0;

  for (let cursor = 0; cursor < rows; cursor += 1) {
    const float = hashToFloat(
      createHmacSha256Hex(
        serverSeed,
        createProvablyFairHmacMessage(clientSeed, nonce, cursor),
      ),
    );
    const goRight = float >= 0.5;
    path.push(goRight);

    if (goRight) {
      bucketIndex += 1;
    }
  }

  return { path, bucketIndex };
};

export const verifyPlinkoRoll = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  rows,
  path,
  bucketIndex,
}: PlinkoRollVerificationInput): PlinkoRollVerificationResult => {
  const expected = rollPlinko(serverSeed, clientSeed, nonce, rows);
  const serverSeedMatchesHash = hashServerSeed(serverSeed) === serverSeedHash;
  const pathMatches =
    path.length === expected.path.length &&
    path.every((step, index) => step === expected.path[index]);
  const bucketMatches = bucketIndex === expected.bucketIndex;
  const verified = serverSeedMatchesHash && pathMatches && bucketMatches;

  return {
    serverSeedMatchesHash,
    pathMatches,
    bucketMatches,
    verified,
    expected,
  };
};
