import {
  assertValidServerSeed,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  hashServerSeed,
  hexToBytes,
  type FairnessState,
} from '../provably-fair/provably-fair';
import {
  CRASH_MULTIPLIER_DECIMALS,
  MAX_CRASH_MULTIPLIER,
} from './limbo-constants';

export type LimboRollVerificationInput = FairnessState & {
  serverSeed: string;
  rolledMultiplier: number;
  rtp: number;
};

export type LimboRollVerificationResult = {
  serverSeedMatchesHash: boolean;
  rolledMultiplierMatches: boolean;
  verified: boolean;
  expectedRolledMultiplier: number;
};

const MIN_FLOAT = 1 / 2 ** 32;

export const rollLimboFromHash = (hashHex: string, rtp: number): number => {
  const bytes = hexToBytes(hashHex);

  if (bytes.length < 4) {
    throw new RangeError('Hash must contain at least 4 bytes');
  }

  const integer =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const float = Math.max(integer / 2 ** 32, MIN_FLOAT);
  const raw = MAX_CRASH_MULTIPLIER / (float * MAX_CRASH_MULTIPLIER);
  const crash = Math.floor(raw * rtp * 100) / 100;
  const factor = 10 ** CRASH_MULTIPLIER_DECIMALS;
  const rounded = Math.floor(crash * factor) / factor;

  return Math.min(MAX_CRASH_MULTIPLIER, Math.max(1, rounded));
};

export const rollLimbo = (
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rtp: number,
): number => {
  assertValidServerSeed(serverSeed);

  return rollLimboFromHash(
    createHmacSha256Hex(
      serverSeed,
      createProvablyFairHmacMessage(clientSeed, nonce),
    ),
    rtp,
  );
};

export const verifyLimboRoll = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  rolledMultiplier,
  rtp,
}: LimboRollVerificationInput): LimboRollVerificationResult => {
  const expectedRolledMultiplier = rollLimbo(
    serverSeed,
    clientSeed,
    nonce,
    rtp,
  );
  const serverSeedMatchesHash = hashServerSeed(serverSeed) === serverSeedHash;
  const rolledMultiplierMatches = rolledMultiplier === expectedRolledMultiplier;
  const verified = serverSeedMatchesHash && rolledMultiplierMatches;

  return {
    serverSeedMatchesHash,
    rolledMultiplierMatches,
    verified,
    expectedRolledMultiplier,
  };
};
