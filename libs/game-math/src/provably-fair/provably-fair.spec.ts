import { describe, expect, it } from 'vitest';

import {
  assertValidServerSeed,
  CLIENT_SEED_LENGTH,
  createHmacSha256Hex,
  createProvablyFairHmacMessage,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  hexToBytes,
  SERVER_SEED_HEX_LENGTH,
} from './provably-fair';

const validServerSeed =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('provably fair primitives', () => {
  it('hashes the server seed with sha256', () => {
    expect(hashServerSeed(validServerSeed)).toBe(
      'dfe7a23fefeea519e9bbfdd1a6be94c4b2e4529dd6b7cbea83f9959c2621b13c',
    );
  });

  it('rejects invalid server seeds', () => {
    expect(() => assertValidServerSeed('abc')).toThrow('Invalid serverSeed');
    expect(() => assertValidServerSeed('g'.repeat(64))).toThrow(
      'Invalid serverSeed',
    );
    expect(() => hashServerSeed('abc')).toThrow('Invalid serverSeed');
  });

  it('generates a valid server seed', () => {
    const serverSeed = generateServerSeed();

    expect(serverSeed).toHaveLength(SERVER_SEED_HEX_LENGTH);
    expect(() => assertValidServerSeed(serverSeed)).not.toThrow();
  });

  it('generates a client seed with the default length', () => {
    const clientSeed = generateClientSeed();

    expect(clientSeed).toHaveLength(CLIENT_SEED_LENGTH);
    expect(clientSeed).toMatch(/^[0-9a-f]+$/i);
  });

  it('builds hmac messages from seed coordinates', () => {
    expect(createProvablyFairHmacMessage('client-seed', 7, 0)).toBe(
      'client-seed:7:0',
    );
  });

  it('defaults the hmac message cursor to zero', () => {
    expect(createProvablyFairHmacMessage('client-seed', 7)).toBe(
      'client-seed:7:0',
    );
  });

  it('creates hmac-sha256 hex output', () => {
    expect(
      createHmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'),
    ).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('converts hex strings to bytes', () => {
    expect(hexToBytes('00ff10')).toEqual([0, 255, 16]);
  });

  it('rejects invalid hex strings', () => {
    expect(() => hexToBytes('abc')).toThrow(RangeError);
    expect(() => hexToBytes('gg')).toThrow(RangeError);
  });
});
