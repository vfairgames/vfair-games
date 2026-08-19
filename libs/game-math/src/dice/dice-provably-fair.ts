import {
  assertValidServerSeed,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  hashServerSeed,
  hexToBytes,
  type FairnessState,
} from '../provably-fair/provably-fair';

export type DiceRollVerificationInput = FairnessState & {
  serverSeed: string;
  rolledValue: number;
};

export type DiceRollVerificationResult = {
  serverSeedMatchesHash: boolean;
  rolledValueMatches: boolean;
  verified: boolean;
  expectedRolledValue: number;
};

export const rollDiceFromHash = (hashHex: string): number => {
  const bytes = hexToBytes(hashHex);

  if (bytes.length < 4) {
    throw new RangeError('Hash must contain at least 4 bytes');
  }

  const integer =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const float = integer / 2 ** 32;

  return Math.floor(float * 10000) / 100;
};

export const rollDice = (
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number => {
  assertValidServerSeed(serverSeed);

  return rollDiceFromHash(
    createHmacSha256Hex(
      serverSeed,
      createProvablyFairHmacMessage(clientSeed, nonce),
    ),
  );
};

export const verifyDiceRoll = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  rolledValue,
}: DiceRollVerificationInput): DiceRollVerificationResult => {
  const expectedRolledValue = rollDice(serverSeed, clientSeed, nonce);
  const serverSeedMatchesHash = hashServerSeed(serverSeed) === serverSeedHash;
  const rolledValueMatches = rolledValue === expectedRolledValue;
  const verified = serverSeedMatchesHash && rolledValueMatches;

  return {
    serverSeedMatchesHash,
    rolledValueMatches,
    verified,
    expectedRolledValue,
  };
};
