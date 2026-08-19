import {
  assertValidServerSeed,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  hashServerSeed,
  hexToBytes,
  type FairnessState,
} from '../provably-fair/provably-fair';
import { KENO_DRAW_COUNT, KENO_POOL_SIZE } from './keno-constants';

type KenoDrawVerificationInput = FairnessState & {
  serverSeed: string;
  drawnNumbers: readonly number[];
};

type KenoDrawVerificationResult = {
  serverSeedMatchesHash: boolean;
  drawMatches: boolean;
  verified: boolean;
  expectedDrawnNumbers: number[];
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

export const drawKenoNumbers = (
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number[] => {
  assertValidServerSeed(serverSeed);

  const numbers = Array.from(
    { length: KENO_POOL_SIZE },
    (_, index) => index + 1,
  );

  for (let cursor = 0; cursor < KENO_POOL_SIZE - 1; cursor += 1) {
    const float = hashToFloat(
      createHmacSha256Hex(
        serverSeed,
        createProvablyFairHmacMessage(clientSeed, nonce, cursor),
      ),
    );
    const remaining = KENO_POOL_SIZE - cursor;
    const swapIndex = cursor + Math.floor(float * remaining);
    const current = numbers[cursor];
    numbers[cursor] = numbers[swapIndex];
    numbers[swapIndex] = current;
  }

  return numbers.slice(0, KENO_DRAW_COUNT).sort((left, right) => left - right);
};

export const verifyKenoDraw = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  drawnNumbers,
}: KenoDrawVerificationInput): KenoDrawVerificationResult => {
  const expectedDrawnNumbers = drawKenoNumbers(serverSeed, clientSeed, nonce);
  const serverSeedMatchesHash = hashServerSeed(serverSeed) === serverSeedHash;
  const drawMatches =
    expectedDrawnNumbers.length === drawnNumbers.length &&
    expectedDrawnNumbers.every(
      (number, index) => number === drawnNumbers[index],
    );

  return {
    serverSeedMatchesHash,
    drawMatches,
    verified: serverSeedMatchesHash && drawMatches,
    expectedDrawnNumbers,
  };
};
