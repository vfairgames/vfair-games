import {
  assertValidServerSeed,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  hashServerSeed,
  hexToBytes,
  type FairnessState,
} from '../provably-fair/provably-fair';
import {
  MAX_MINE_COUNT,
  MIN_MINE_COUNT,
  MINES_GRID_SIZE,
} from './mines-constants';

type MinesLayoutVerificationInput = FairnessState & {
  serverSeed: string;
  mineCount: number;
  mineLayout: readonly number[];
  gridSize?: number;
};

type MinesLayoutVerificationResult = {
  serverSeedMatchesHash: boolean;
  layoutMatches: boolean;
  verified: boolean;
  expectedMineLayout: number[];
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

const assertMineCount = (mineCount: number, gridSize: number): void => {
  const maxMineCount = Math.min(MAX_MINE_COUNT, gridSize - 1);

  if (
    !Number.isInteger(mineCount) ||
    mineCount < MIN_MINE_COUNT ||
    mineCount > maxMineCount
  ) {
    throw new RangeError(
      `Mine count must be an integer between ${MIN_MINE_COUNT} and ${maxMineCount}`,
    );
  }
};

export const generateMineLayout = (
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number,
  gridSize = MINES_GRID_SIZE,
): number[] => {
  assertValidServerSeed(serverSeed);
  assertMineCount(mineCount, gridSize);

  const tiles = Array.from({ length: gridSize }, (_, index) => index);

  for (let cursor = 0; cursor < gridSize - 1; cursor += 1) {
    const float = hashToFloat(
      createHmacSha256Hex(
        serverSeed,
        createProvablyFairHmacMessage(clientSeed, nonce, cursor),
      ),
    );
    const remaining = gridSize - cursor;
    const swapIndex = cursor + Math.floor(float * remaining);
    const current = tiles[cursor];
    tiles[cursor] = tiles[swapIndex];
    tiles[swapIndex] = current;
  }

  return tiles.slice(0, mineCount).sort((left, right) => left - right);
};

export const verifyMineLayout = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  mineCount,
  mineLayout,
  gridSize = MINES_GRID_SIZE,
}: MinesLayoutVerificationInput): MinesLayoutVerificationResult => {
  const expectedMineLayout = generateMineLayout(
    serverSeed,
    clientSeed,
    nonce,
    mineCount,
    gridSize,
  );
  const serverSeedMatchesHash = hashServerSeed(serverSeed) === serverSeedHash;
  const layoutMatches =
    expectedMineLayout.length === mineLayout.length &&
    expectedMineLayout.every((tile, index) => tile === mineLayout[index]);
  const verified = serverSeedMatchesHash && layoutMatches;

  return {
    serverSeedMatchesHash,
    layoutMatches,
    verified,
    expectedMineLayout,
  };
};
