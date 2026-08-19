import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export type ProvablyFairFields = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  cursor: number;
};

export type FairnessState = Omit<ProvablyFairFields, 'cursor'>;

export const SERVER_SEED_HEX_LENGTH = 64;

const SERVER_SEED_BYTE_LENGTH = SERVER_SEED_HEX_LENGTH / 2;

export const CLIENT_SEED_LENGTH = 10;

const CLIENT_SEED_BYTE_LENGTH = CLIENT_SEED_LENGTH / 2;

const SERVER_SEED_HEX_PATTERN = new RegExp(
  `^[\\da-f]{${SERVER_SEED_HEX_LENGTH}}$`,
  'i',
);

export const assertValidServerSeed = (serverSeed: string): void => {
  if (!SERVER_SEED_HEX_PATTERN.test(serverSeed)) {
    throw new Error('Invalid serverSeed');
  }
};

export const generateServerSeed = (): string =>
  bytesToHex(randomBytes(SERVER_SEED_BYTE_LENGTH));

export const generateClientSeed = (): string =>
  bytesToHex(randomBytes(CLIENT_SEED_BYTE_LENGTH));

export const hexToBytes = (hex: string): number[] => {
  if (!/^[\da-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new RangeError('Hash must be an even-length hex string');
  }

  const bytes: number[] = [];

  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }

  return bytes;
};

export const sha256Hex = (value: string): string =>
  bytesToHex(sha256(utf8ToBytes(value)));

export const hashServerSeed = (serverSeed: string): string => {
  assertValidServerSeed(serverSeed);
  return sha256Hex(serverSeed);
};

export const createProvablyFairHmacMessage = (
  clientSeed: string,
  nonce: number,
  cursor = 0,
): string => `${clientSeed}:${nonce}:${cursor}`;

export const createHmacSha256Hex = (key: string, message: string): string => {
  return bytesToHex(hmac(sha256, utf8ToBytes(key), utf8ToBytes(message)));
};
